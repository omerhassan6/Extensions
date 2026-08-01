import { v4 as uuid } from "uuid";
import {
  ActionType,
  BrowserSimulationConfig,
  ConcurrencyConfig,
  DEFAULT_ACTIONS,
  HttpMethod,
  IpSimulationConfig,
  NetworkSimulationConfig,
  TargetConfig,
  TestConfig,
  UserGroup,
  UserGroupPreset,
} from "./types";

export const USER_GROUP_PRESETS: Record<
  Exclude<UserGroupPreset, "custom">,
  Omit<UserGroup, "id" | "name" | "preset" | "users" | "actions">
> = {
  slow_users: {
    rampUpSec: 30,
    thinkTimeMs: [3000, 8000],
    sessionDurationSec: 180,
    clickSpeed: "slow",
    randomWaitMs: [1000, 5000],
    randomNavigation: true,
    sessionTimeoutSec: 300,
    color: "#f59e0b",
  },
  normal_users: {
    rampUpSec: 20,
    thinkTimeMs: [1000, 3000],
    sessionDurationSec: 120,
    clickSpeed: "normal",
    randomWaitMs: [500, 2000],
    randomNavigation: true,
    sessionTimeoutSec: 240,
    color: "#3b82f6",
  },
  fast_users: {
    rampUpSec: 10,
    thinkTimeMs: [200, 800],
    sessionDurationSec: 60,
    clickSpeed: "fast",
    randomWaitMs: [100, 500],
    randomNavigation: false,
    sessionTimeoutSec: 120,
    color: "#22c55e",
  },
  heavy_users: {
    rampUpSec: 15,
    thinkTimeMs: [200, 600],
    sessionDurationSec: 240,
    clickSpeed: "fast",
    randomWaitMs: [100, 400],
    randomNavigation: true,
    sessionTimeoutSec: 360,
    color: "#ef4444",
  },
  returning_users: {
    rampUpSec: 20,
    thinkTimeMs: [800, 2000],
    sessionDurationSec: 150,
    clickSpeed: "normal",
    randomWaitMs: [300, 1200],
    randomNavigation: false,
    sessionTimeoutSec: 240,
    color: "#8b5cf6",
  },
  guest_users: {
    rampUpSec: 25,
    thinkTimeMs: [1500, 4000],
    sessionDurationSec: 90,
    clickSpeed: "normal",
    randomWaitMs: [500, 2500],
    randomNavigation: true,
    sessionTimeoutSec: 180,
    color: "#06b6d4",
  },
};

export const USER_GROUP_LABELS: Record<UserGroupPreset, string> = {
  slow_users: "Slow Users",
  normal_users: "Normal Users",
  fast_users: "Fast Users",
  heavy_users: "Heavy Users",
  returning_users: "Returning Users",
  guest_users: "Guest Users",
  custom: "Custom Group",
};

export function createUserGroup(preset: UserGroupPreset, users = 50): UserGroup {
  const base =
    preset === "custom"
      ? USER_GROUP_PRESETS.normal_users
      : USER_GROUP_PRESETS[preset];
  return {
    id: uuid(),
    name: USER_GROUP_LABELS[preset],
    preset,
    users,
    actions: DEFAULT_ACTIONS.map((a) => ({ ...a })),
    ...base,
  };
}

export function defaultTarget(): TargetConfig {
  return {
    url: "",
    apiBaseUrl: "",
    method: "GET",
    headers: [{ id: uuid(), key: "Content-Type", value: "application/json", enabled: true }],
    authToken: "",
    cookies: "",
    requestBody: "",
    queryParams: [],
    environment: "staging",
  };
}

export function defaultConcurrency(): ConcurrencyConfig {
  return {
    concurrentUsers: 200,
    requestsPerSecond: 50,
    maxActiveSessions: 500,
    connectionTimeoutMs: 30000,
    retryAttempts: 2,
    testDurationSec: 120,
  };
}

export function defaultIpSimulation(): IpSimulationConfig {
  return {
    mode: "random_pool",
    geoLocations: ["United States", "Germany", "India", "Brazil"],
    poolSize: 100,
  };
}

export function defaultBrowserSimulation(): BrowserSimulationConfig {
  return {
    browsers: ["chrome", "firefox", "safari", "edge"],
    devices: ["desktop", "mobile"],
    randomUserAgent: true,
    randomResolution: true,
  };
}

export function defaultNetworkSimulation(): NetworkSimulationConfig {
  return {
    profile: "average_broadband",
    packetLossPct: 0,
    extraLatencyMs: 0,
  };
}

export function createDefaultTestConfig(): TestConfig {
  return {
    id: uuid(),
    name: "New Performance Test",
    target: defaultTarget(),
    userGroups: [createUserGroup("normal_users", 100), createUserGroup("fast_users", 40)],
    trafficPattern: "ramp_up",
    concurrency: defaultConcurrency(),
    ipSimulation: defaultIpSimulation(),
    browserSimulation: defaultBrowserSimulation(),
    networkSimulation: defaultNetworkSimulation(),
    createdAt: Date.now(),
  };
}

export const NETWORK_PROFILE_LABELS: Record<string, string> = {
  high_speed: "High Speed Internet",
  average_broadband: "Average Broadband",
  slow_connection: "Slow Connection",
  mobile_network: "Mobile Network",
  high_latency: "High Latency",
  packet_loss: "Packet Loss",
  bandwidth_limited: "Bandwidth Limitation",
};

export const NETWORK_PROFILE_PARAMS: Record<
  string,
  { latencyMs: number; jitter: number; lossPct: number; bandwidthCapKbps: number | null }
> = {
  high_speed: { latencyMs: 10, jitter: 5, lossPct: 0, bandwidthCapKbps: null },
  average_broadband: { latencyMs: 40, jitter: 15, lossPct: 0.2, bandwidthCapKbps: 20000 },
  slow_connection: { latencyMs: 150, jitter: 60, lossPct: 1.5, bandwidthCapKbps: 2000 },
  mobile_network: { latencyMs: 90, jitter: 50, lossPct: 1, bandwidthCapKbps: 5000 },
  high_latency: { latencyMs: 400, jitter: 120, lossPct: 0.5, bandwidthCapKbps: 10000 },
  packet_loss: { latencyMs: 80, jitter: 40, lossPct: 6, bandwidthCapKbps: 8000 },
  bandwidth_limited: { latencyMs: 60, jitter: 20, lossPct: 0.5, bandwidthCapKbps: 512 },
};

export const TRAFFIC_PATTERN_LABELS: Record<string, string> = {
  steady: "Steady Load",
  ramp_up: "Gradual Ramp Up",
  ramp_down: "Gradual Ramp Down",
  spike: "Sudden Traffic Spike",
  peak_hour: "Peak Hour Simulation",
  random: "Random Traffic",
  wave: "Wave Pattern",
  burst: "Burst Traffic",
};

export const ACTION_LABELS: Record<string, string> = {
  open_home: "Open Home Page",
  browse_categories: "Browse Categories",
  product_details: "Open Product Details",
  search: "Search Products",
  apply_filters: "Apply Filters",
  scroll: "Scroll",
  click_buttons: "Click Buttons",
  open_images: "Open Images",
  submit_form: "Submit Forms",
  login: "Login",
  logout: "Logout",
  refresh: "Refresh Pages",
  navigate_back: "Navigate Back",
  random_delay: "Random Delays Between Actions",
};

// Maps each configured user-behavior action to the HTTP call it would
// realistically trigger against the target under test. Actions with no
// entry (scroll, random_delay) are client-side only and generate no request.
export const ACTION_ENDPOINTS: Partial<Record<ActionType, { path: string; method: HttpMethod }>> = {
  open_home: { path: "/", method: "GET" },
  product_details: { path: "/api/products/:id", method: "GET" },
  search: { path: "/api/search", method: "GET" },
  apply_filters: { path: "/api/products", method: "GET" },
  open_images: { path: "/api/products/:id/images", method: "GET" },
  submit_form: { path: "/api/forms/submit", method: "POST" },
  login: { path: "/api/auth/login", method: "POST" },
  logout: { path: "/api/auth/logout", method: "POST" },
  refresh: { path: "/", method: "GET" },
  navigate_back: { path: "/", method: "GET" },
};

/** Joins a relative path onto the configured target, honoring any base path in the URL. */
function joinTargetPath(base: string, path: string): string {
  const trimmedBase = base.trim();
  if (!trimmedBase) return path;
  try {
    const url = new URL(trimmedBase);
    const basePath = url.pathname.replace(/\/$/, "");
    return path === "/" ? basePath || "/" : `${basePath}${path}`;
  } catch {
    const cleanBase = trimmedBase.replace(/\/$/, "");
    return path === "/" ? cleanBase || "/" : `${cleanBase}${path}`;
  }
}

export interface WeightedEndpoint {
  endpoint: string;
  method: HttpMethod;
  weight: number;
}

/**
 * Derives the set of endpoints a test will actually exercise, based on the
 * configured target URL/API and which user-behavior actions are enabled
 * (probability > 0) across the test's user groups — replacing any fixed,
 * hardcoded endpoint list.
 */
export function deriveEndpointProfile(config: TestConfig): WeightedEndpoint[] {
  const base = config.target.apiBaseUrl?.trim() || config.target.url?.trim() || "";

  const actionWeights = new Map<ActionType, number>();
  for (const group of config.userGroups) {
    for (const action of group.actions) {
      if (action.probability <= 0) continue;
      actionWeights.set(
        action.type,
        Math.max(actionWeights.get(action.type) ?? 0, action.probability)
      );
    }
  }
  if (actionWeights.size === 0) {
    for (const action of DEFAULT_ACTIONS) actionWeights.set(action.type, action.probability);
  }

  const profile: WeightedEndpoint[] = [
    // The configured target itself is always the dominant endpoint under test.
    { endpoint: base || "/", method: config.target.method, weight: 120 },
  ];

  for (const [type, weight] of actionWeights) {
    const mapped = ACTION_ENDPOINTS[type];
    if (!mapped) continue;
    profile.push({
      endpoint: joinTargetPath(base, mapped.path),
      method: mapped.method,
      weight,
    });
  }

  return profile;
}

export const COUNTRIES = [
  "United States",
  "Germany",
  "India",
  "Brazil",
  "United Kingdom",
  "Japan",
  "Australia",
  "Canada",
  "France",
  "Singapore",
];

export const BROWSER_LABELS: Record<string, string> = {
  chrome: "Chrome",
  firefox: "Firefox",
  safari: "Safari",
  edge: "Edge",
  android_chrome: "Android Chrome",
  iphone_safari: "iPhone Safari",
  random: "Random User Agent",
};
