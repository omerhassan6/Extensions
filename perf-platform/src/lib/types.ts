// Core domain types for the performance testing platform.
// All test execution in this MVP is simulated client-side (see lib/simulator.ts) —
// no real traffic is sent to the target URL.

export type Environment = "production" | "staging" | "development";
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface KeyValue {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface TargetConfig {
  url: string;
  apiBaseUrl: string;
  method: HttpMethod;
  headers: KeyValue[];
  authToken: string;
  cookies: string;
  requestBody: string;
  queryParams: KeyValue[];
  environment: Environment;
}

export type ActionType =
  | "open_home"
  | "browse_categories"
  | "product_details"
  | "search"
  | "apply_filters"
  | "scroll"
  | "click_buttons"
  | "open_images"
  | "submit_form"
  | "login"
  | "logout"
  | "refresh"
  | "navigate_back"
  | "random_delay";

export interface ScenarioAction {
  type: ActionType;
  probability: number; // 0-100
}

export const DEFAULT_ACTIONS: ScenarioAction[] = [
  { type: "open_home", probability: 100 },
  { type: "browse_categories", probability: 70 },
  { type: "product_details", probability: 60 },
  { type: "search", probability: 45 },
  { type: "apply_filters", probability: 30 },
  { type: "scroll", probability: 80 },
  { type: "click_buttons", probability: 65 },
  { type: "open_images", probability: 35 },
  { type: "submit_form", probability: 20 },
  { type: "login", probability: 25 },
  { type: "logout", probability: 10 },
  { type: "refresh", probability: 15 },
  { type: "navigate_back", probability: 30 },
  { type: "random_delay", probability: 50 },
];

export type UserGroupPreset =
  | "slow_users"
  | "normal_users"
  | "fast_users"
  | "heavy_users"
  | "returning_users"
  | "guest_users"
  | "custom";

export interface UserGroup {
  id: string;
  name: string;
  preset: UserGroupPreset;
  users: number;
  rampUpSec: number;
  thinkTimeMs: [number, number];
  sessionDurationSec: number;
  clickSpeed: "slow" | "normal" | "fast";
  randomWaitMs: [number, number];
  randomNavigation: boolean;
  sessionTimeoutSec: number;
  actions: ScenarioAction[];
  color: string;
}

export type TrafficPattern =
  | "steady"
  | "ramp_up"
  | "ramp_down"
  | "spike"
  | "peak_hour"
  | "random"
  | "wave"
  | "burst";

export interface ConcurrencyConfig {
  concurrentUsers: number;
  requestsPerSecond: number;
  maxActiveSessions: number;
  connectionTimeoutMs: number;
  retryAttempts: number;
  testDurationSec: number;
}

export type IpMode =
  | "single"
  | "random_pool"
  | "geo_distributed"
  | "sticky_sessions"
  | "auto_rotate";

export interface IpSimulationConfig {
  mode: IpMode;
  geoLocations: string[];
  poolSize: number;
}

export type BrowserType =
  | "chrome"
  | "firefox"
  | "safari"
  | "edge"
  | "android_chrome"
  | "iphone_safari"
  | "random";

export type DeviceType = "desktop" | "tablet" | "mobile";

export interface BrowserSimulationConfig {
  browsers: BrowserType[];
  devices: DeviceType[];
  randomUserAgent: boolean;
  randomResolution: boolean;
}

export type NetworkProfile =
  | "high_speed"
  | "average_broadband"
  | "slow_connection"
  | "mobile_network"
  | "high_latency"
  | "packet_loss"
  | "bandwidth_limited";

export interface NetworkSimulationConfig {
  profile: NetworkProfile;
  packetLossPct: number;
  extraLatencyMs: number;
}

export interface TestConfig {
  id: string;
  name: string;
  target: TargetConfig;
  userGroups: UserGroup[];
  trafficPattern: TrafficPattern;
  concurrency: ConcurrencyConfig;
  ipSimulation: IpSimulationConfig;
  browserSimulation: BrowserSimulationConfig;
  networkSimulation: NetworkSimulationConfig;
  createdAt: number;
}

export interface MetricSnapshot {
  t: number; // seconds since test start
  timestamp: number;
  activeUsers: number;
  concurrentUsers: number;
  rps: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95: number;
  p99: number;
  successRate: number;
  failureRate: number;
  timeoutCount: number;
  connectionErrors: number;
  serverErrorCount: number;
  bandwidthKbps: number;
  cpuUsage: number;
  memoryUsage: number;
  errorRate: number;
  statusCodes: Record<string, number>;
  uniqueIps: number;
}

export interface RequestLogEntry {
  id: string;
  timestamp: number;
  virtualUser: string;
  ip: string;
  browser: string;
  country: string;
  endpoint: string;
  method: HttpMethod;
  statusCode: number;
  responseTimeMs: number;
  responseSizeKb: number;
  retryCount: number;
}

export interface EndpointStat {
  endpoint: string;
  avgResponseTime: number;
  count: number;
  errorCount: number;
}

export interface TestReport {
  configId: string;
  configName: string;
  targetUrl: string;
  startedAt: number;
  finishedAt: number;
  durationSec: number;
  totalRequests: number;
  successCount: number;
  failureCount: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95: number;
  p99: number;
  timeoutCount: number;
  connectionErrors: number;
  peakRps: number;
  peakConcurrentUsers: number;
  slowestEndpoints: EndpointStat[];
  fastestEndpoints: EndpointStat[];
  statusCodeDistribution: Record<string, number>;
  recommendations: string[];
  series: MetricSnapshot[];
  logs: RequestLogEntry[];
}

export interface HistoryEntry {
  id: string;
  config: TestConfig;
  report: TestReport;
  status: "completed" | "stopped";
}
