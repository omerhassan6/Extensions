// Client-side simulated load-test engine.
//
// This does NOT send any real network traffic to the configured target.
// It generates plausible, internally-consistent time-series metrics and
// request-log entries so the full product experience (live dashboard,
// charts, reports, history) can be built and demoed safely. Swapping this
// module for a real distributed load generator is the natural next step
// once the UI/workflow above it is validated.

import { v4 as uuid } from "uuid";
import {
  BrowserType,
  ConcurrencyConfig,
  DeviceType,
  EndpointStat,
  MetricSnapshot,
  RequestLogEntry,
  TestConfig,
  TestReport,
  TrafficPattern,
  UserGroup,
} from "./types";
import {
  BROWSER_LABELS,
  COUNTRIES,
  NETWORK_PROFILE_PARAMS,
  WeightedEndpoint,
  deriveEndpointProfile,
} from "./presets";

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function weightedPick<T extends { weight: number }>(arr: T[], rnd: () => number): T {
  const total = arr.reduce((s, item) => s + item.weight, 0);
  let r = rnd() * total;
  for (const item of arr) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return arr[arr.length - 1];
}

function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Load multiplier in [0,1] for a given traffic pattern at progress p in [0,1]. */
export function trafficMultiplier(pattern: TrafficPattern, p: number): number {
  switch (pattern) {
    case "steady":
      return 1;
    case "ramp_up":
      return Math.min(1, p / 0.4 + 0.05);
    case "ramp_down":
      return Math.max(0.05, 1 - p / 0.4);
    case "spike":
      return p > 0.4 && p < 0.55 ? 1 : 0.25;
    case "peak_hour": {
      // bell curve peaking mid-test
      const x = (p - 0.5) * 4;
      return 0.2 + 0.8 * Math.exp(-x * x);
    }
    case "random":
      return 0.3 + 0.7 * Math.abs(Math.sin(p * 37.13) * Math.cos(p * 13.7));
    case "wave":
      return 0.5 + 0.5 * Math.sin(p * Math.PI * 6);
    case "burst": {
      const cycle = (p * 8) % 1;
      return cycle < 0.15 ? 1 : 0.2;
    }
    default:
      return 1;
  }
}

function pick<T>(arr: T[], rnd: () => number): T {
  return arr[Math.floor(rnd() * arr.length)] || arr[0];
}

function randomIp(rnd: () => number): string {
  return `${Math.floor(rnd() * 223) + 1}.${Math.floor(rnd() * 255)}.${Math.floor(
    rnd() * 255
  )}.${Math.floor(rnd() * 255)}`;
}

function resolveClickSpeedFactor(group: UserGroup): number {
  if (group.clickSpeed === "fast") return 0.6;
  if (group.clickSpeed === "slow") return 1.6;
  return 1;
}

export interface SimulationTickResult {
  snapshot: MetricSnapshot;
  logs: RequestLogEntry[];
}

/**
 * Deterministic-ish simulator: given config + elapsed seconds, produces one
 * second worth of metrics + a sample of request logs.
 */
export class LoadTestSimulator {
  private config: TestConfig;
  private rnd: () => number;
  private baseLatency: number;
  private startedAt: number;
  private endpointProfile: WeightedEndpoint[];

  constructor(config: TestConfig) {
    this.config = config;
    this.rnd = seededRandom(
      Array.from(config.id).reduce((a, c) => a + c.charCodeAt(0), 1)
    );
    const netParams = NETWORK_PROFILE_PARAMS[config.networkSimulation.profile];
    this.baseLatency = netParams.latencyMs + config.networkSimulation.extraLatencyMs;
    this.startedAt = Date.now();
    this.endpointProfile = deriveEndpointProfile(config);
  }

  totalConfiguredUsers(): number {
    return this.config.userGroups.reduce((sum, g) => sum + g.users, 0);
  }

  tick(elapsedSec: number): SimulationTickResult {
    const { concurrency, trafficPattern, networkSimulation } = this.config;
    const duration = concurrency.testDurationSec;
    const p = Math.min(1, elapsedSec / duration);
    const mult = trafficMultiplier(trafficPattern, p);

    const totalUsers = this.totalConfiguredUsers() || 1;
    // small organic jitter
    const jitter = 1 + (this.rnd() - 0.5) * 0.08;

    // Demand: how many of the configured virtual users are actively trying to
    // hit the target right now. This is NOT capped to the configured
    // "Concurrent Users" capacity — oversubscribing (more virtual users than
    // capacity) is exactly what should overload the target below.
    const demand = Math.max(1, Math.round(totalUsers * mult * jitter));

    // Sessions the target can actually hold; excess demand gets turned away
    // (see sessionOverflowRate) instead of silently vanishing.
    const maxSessions = concurrency.maxActiveSessions || demand;
    const concurrentUsers = Math.min(demand, maxSessions);
    const activeUsers = Math.min(
      totalUsers,
      Math.round(concurrentUsers * (0.9 + this.rnd() * 0.2))
    );

    const netParams = NETWORK_PROFILE_PARAMS[networkSimulation.profile];
    // load relative to configured capacity — can exceed 1 when demand > capacity
    const loadFactor = demand / Math.max(1, concurrency.concurrentUsers);
    // response time degrades super-linearly as load approaches/exceeds capacity,
    // capped so extreme oversubscription reads as "very bad" (tens of seconds)
    // rather than a nonsensical multi-hour average.
    const strain = Math.min(5, Math.max(0, loadFactor - 0.7) * 3.2);
    const avgResponseTime = Math.round(
      this.baseLatency * (1 + strain * strain) + this.rnd() * netParams.jitter
    );
    const maxResponseTime = Math.round(
      avgResponseTime * (1.8 + this.rnd() * 1.4 + strain)
    );
    const minResponseTime = Math.max(
      5,
      Math.round(avgResponseTime * (0.35 + this.rnd() * 0.15))
    );
    const p95 = Math.round(avgResponseTime * (1.5 + strain * 0.8));
    const p99 = Math.round(avgResponseTime * (2.1 + strain * 1.3));

    const rps = Math.max(
      1,
      Math.round(
        Math.min(concurrency.requestsPerSecond * mult, concurrentUsers * 1.2) * jitter
      )
    );

    // error/timeout rates climb once the system is over capacity
    const overload = Math.max(0, loadFactor - 1);
    // requests turned away outright because every session slot is taken
    const sessionOverflowRate = Math.max(0, demand - maxSessions) / demand;
    // requests that blow past the configured connection timeout
    const timeoutRate = clamp01(
      (avgResponseTime - concurrency.connectionTimeoutMs) /
        Math.max(1, concurrency.connectionTimeoutMs)
    );

    const baseErrorRate =
      netParams.lossPct / 100 + overload * 0.35 + sessionOverflowRate * 0.5 + timeoutRate * 0.5;
    const errorRate = Math.min(0.98, Math.max(0.001, baseErrorRate + this.rnd() * 0.01));
    const failureRate = errorRate;
    const successRate = 1 - failureRate;

    const timeoutCount = Math.round(rps * timeoutRate * (0.6 + this.rnd() * 0.4));
    const connectionErrors = Math.round(rps * sessionOverflowRate * (0.5 + this.rnd() * 0.5));
    const serverErrorCount = Math.round(
      rps * Math.max(0, errorRate - timeoutRate - sessionOverflowRate) * (0.5 + this.rnd() * 0.5)
    );

    const bandwidthKbps = Math.round(
      rps * (20 + this.rnd() * 60) *
        (netParams.bandwidthCapKbps ? Math.min(1, netParams.bandwidthCapKbps / (rps * 40)) : 1)
    );
    const cpuUsage = Math.min(100, Math.round(20 + loadFactor * 55 + this.rnd() * 10));
    const memoryUsage = Math.min(100, Math.round(30 + loadFactor * 45 + this.rnd() * 8));

    const statusCodes: Record<string, number> = {};
    const okCount = Math.round(rps * successRate);
    let errCount = Math.max(0, rps - okCount);
    statusCodes["200"] = okCount;
    if (errCount > 0) {
      const timedOut = Math.min(errCount, Math.round(rps * timeoutRate));
      if (timedOut > 0) statusCodes["504"] = timedOut;
      errCount -= timedOut;

      const overflowed = Math.min(errCount, Math.round(rps * sessionOverflowRate));
      if (overflowed > 0) statusCodes["503"] = overflowed;
      errCount -= overflowed;

      const serverErr = Math.round(errCount * 0.5);
      const clientErr = errCount - serverErr;
      if (serverErr > 0) statusCodes["500"] = serverErr;
      if (clientErr > 0) statusCodes["429"] = clientErr;
    }

    const uniqueIps =
      this.config.ipSimulation.mode === "single"
        ? 1
        : Math.min(this.config.ipSimulation.poolSize, Math.round(concurrentUsers * 0.85));

    const snapshot: MetricSnapshot = {
      t: elapsedSec,
      timestamp: this.startedAt + elapsedSec * 1000,
      activeUsers,
      concurrentUsers,
      rps,
      avgResponseTime,
      minResponseTime,
      maxResponseTime,
      p95,
      p99,
      successRate: successRate * 100,
      failureRate: failureRate * 100,
      timeoutCount,
      connectionErrors,
      serverErrorCount,
      bandwidthKbps,
      cpuUsage,
      memoryUsage,
      errorRate: errorRate * 100,
      statusCodes,
      uniqueIps,
    };

    const logs = this.generateLogs(snapshot);
    return { snapshot, logs };
  }

  private generateLogs(snapshot: MetricSnapshot, sampleSize = 6): RequestLogEntry[] {
    const logs: RequestLogEntry[] = [];
    const groups = this.config.userGroups.length
      ? this.config.userGroups
      : [
          {
            id: "default",
            name: "Users",
          } as UserGroup,
        ];
    const browsers: BrowserType[] = this.config.browserSimulation.browsers.length
      ? this.config.browserSimulation.browsers
      : ["chrome"];

    for (let i = 0; i < sampleSize; i++) {
      const group = pick(groups, this.rnd);
      const speedFactor = group.clickSpeed ? resolveClickSpeedFactor(group) : 1;
      const isError = this.rnd() < snapshot.errorRate / 100;
      const status = isError ? pick([500, 502, 503, 429, 504], this.rnd) : 200;
      const responseTime = Math.max(
        5,
        Math.round(
          (snapshot.avgResponseTime + (this.rnd() - 0.5) * snapshot.avgResponseTime) *
            speedFactor
        )
      );
      const call = weightedPick(this.endpointProfile, this.rnd);
      logs.push({
        id: uuid(),
        timestamp: snapshot.timestamp,
        virtualUser: `${group.name || "User"}-${Math.floor(this.rnd() * group.users || 1) + 1}`,
        ip: randomIp(this.rnd),
        browser: BROWSER_LABELS[pick(browsers, this.rnd)] || "Chrome",
        country: pick(this.config.ipSimulation.geoLocations.length ? this.config.ipSimulation.geoLocations : COUNTRIES, this.rnd),
        endpoint: call.endpoint,
        method: call.method,
        statusCode: status,
        responseTimeMs: responseTime,
        responseSizeKb: Math.round((5 + this.rnd() * 120) * 10) / 10,
        retryCount: isError ? Math.round(this.rnd() * this.config.concurrency.retryAttempts) : 0,
      });
    }
    return logs;
  }
}

export function buildReport(
  config: TestConfig,
  series: MetricSnapshot[],
  logs: RequestLogEntry[],
  startedAt: number,
  finishedAt: number
): TestReport {
  const totalRequests = series.reduce((s, m) => s + m.rps, 0);
  const failureCount = Math.round(
    series.reduce((s, m) => s + (m.rps * m.failureRate) / 100, 0)
  );
  const successCount = totalRequests - failureCount;
  const avgResponseTime =
    series.length > 0
      ? Math.round(series.reduce((s, m) => s + m.avgResponseTime, 0) / series.length)
      : 0;
  const minResponseTime = series.length ? Math.min(...series.map((m) => m.minResponseTime)) : 0;
  const maxResponseTime = series.length ? Math.max(...series.map((m) => m.maxResponseTime)) : 0;
  const p95 = series.length ? Math.round(series.reduce((s, m) => s + m.p95, 0) / series.length) : 0;
  const p99 = series.length ? Math.round(series.reduce((s, m) => s + m.p99, 0) / series.length) : 0;
  const timeoutCount = series.reduce((s, m) => s + m.timeoutCount, 0);
  const connectionErrors = series.reduce((s, m) => s + m.connectionErrors, 0);
  const peakRps = series.length ? Math.max(...series.map((m) => m.rps)) : 0;
  const peakConcurrentUsers = series.length
    ? Math.max(...series.map((m) => m.concurrentUsers))
    : 0;

  const statusCodeDistribution: Record<string, number> = {};
  for (const m of series) {
    for (const [code, count] of Object.entries(m.statusCodes)) {
      statusCodeDistribution[code] = (statusCodeDistribution[code] || 0) + count;
    }
  }

  const byEndpoint = new Map<string, { total: number; count: number; errors: number }>();
  for (const log of logs) {
    const e = byEndpoint.get(log.endpoint) || { total: 0, count: 0, errors: 0 };
    e.total += log.responseTimeMs;
    e.count += 1;
    if (log.statusCode >= 400) e.errors += 1;
    byEndpoint.set(log.endpoint, e);
  }
  const endpointStats: EndpointStat[] = Array.from(byEndpoint.entries()).map(
    ([endpoint, v]) => ({
      endpoint,
      avgResponseTime: Math.round(v.total / v.count),
      count: v.count,
      errorCount: v.errors,
    })
  );
  const slowestEndpoints = [...endpointStats]
    .sort((a, b) => b.avgResponseTime - a.avgResponseTime)
    .slice(0, 5);
  const fastestEndpoints = [...endpointStats]
    .sort((a, b) => a.avgResponseTime - b.avgResponseTime)
    .slice(0, 5);

  const recommendations: string[] = [];
  if (peakConcurrentUsers && config.concurrency.concurrentUsers) {
    const util = peakConcurrentUsers / config.concurrency.concurrentUsers;
    if (util > 0.95) {
      recommendations.push(
        "The system approached configured concurrency limits. Consider horizontal scaling or connection pool tuning before launch."
      );
    }
  }
  if (failureCount / Math.max(1, totalRequests) > 0.05) {
    recommendations.push(
      "Failure rate exceeded 5% under load. Investigate error responses (5xx/429) and add graceful degradation or rate-limit backoff."
    );
  }
  if (p99 > avgResponseTime * 3) {
    recommendations.push(
      "P99 latency is significantly higher than average — a subset of requests are experiencing tail latency. Check slow DB queries or lock contention."
    );
  }
  if (timeoutCount > 0) {
    recommendations.push(
      `${timeoutCount} requests timed out during the test. Review connection timeout settings and backend response budgets.`
    );
  }
  if (config.trafficPattern === "spike" || config.trafficPattern === "burst") {
    recommendations.push(
      "Traffic spikes caused visible latency/error increases. Consider auto-scaling policies with faster reaction time or a request queue/buffer."
    );
  }
  if (recommendations.length === 0) {
    recommendations.push(
      "No critical bottlenecks detected at this load level. Consider re-testing at higher concurrency to find the breaking point."
    );
  }

  return {
    configId: config.id,
    configName: config.name,
    targetUrl: config.target.url || config.target.apiBaseUrl,
    startedAt,
    finishedAt,
    durationSec: Math.round((finishedAt - startedAt) / 1000),
    totalRequests,
    successCount,
    failureCount,
    avgResponseTime,
    minResponseTime,
    maxResponseTime,
    p95,
    p99,
    timeoutCount,
    connectionErrors,
    peakRps,
    peakConcurrentUsers,
    slowestEndpoints,
    fastestEndpoints,
    statusCodeDistribution,
    recommendations,
    series,
    logs,
  };
}
