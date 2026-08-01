"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { v4 as uuid } from "uuid";
import { Plus, Rocket, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { KeyValueEditor } from "@/components/config/key-value-editor";
import { UserGroupEditor } from "@/components/config/user-group-editor";
import {
  BROWSER_LABELS,
  COUNTRIES,
  NETWORK_PROFILE_LABELS,
  TRAFFIC_PATTERN_LABELS,
  USER_GROUP_LABELS,
  createDefaultTestConfig,
  createUserGroup,
} from "@/lib/presets";
import {
  BrowserType,
  DeviceType,
  Environment,
  HttpMethod,
  IpMode,
  NetworkProfile,
  TrafficPattern,
  UserGroupPreset,
} from "@/lib/types";
import { useTestRunStore } from "@/lib/test-run-store";
import { consumeDraftConfig } from "@/lib/storage";
import { toast } from "sonner";

const METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const ENVIRONMENTS: Environment[] = ["production", "staging", "development"];
const IP_MODES: { value: IpMode; label: string }[] = [
  { value: "single", label: "Single IP" },
  { value: "random_pool", label: "Random IP Pool" },
  { value: "geo_distributed", label: "Multiple Geographic Locations" },
  { value: "sticky_sessions", label: "Sticky Sessions" },
  { value: "auto_rotate", label: "Automatic IP Rotation" },
];
const DEVICE_TYPES: DeviceType[] = ["desktop", "tablet", "mobile"];

export default function NewTestPage() {
  const router = useRouter();
  const start = useTestRunStore((s) => s.start);
  const [config, setConfig] = React.useState(createDefaultTestConfig);

  React.useEffect(() => {
    const draft = consumeDraftConfig();
    if (draft) {
      setConfig(draft);
      toast.info("Loaded cloned test configuration.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalUsers = config.userGroups.reduce((s, g) => s + g.users, 0);

  function patch<K extends keyof typeof config>(key: K, value: (typeof config)[K]) {
    setConfig((c) => ({ ...c, [key]: value }));
  }
  function patchTarget(p: Partial<typeof config.target>) {
    setConfig((c) => ({ ...c, target: { ...c.target, ...p } }));
  }
  function patchConcurrency(p: Partial<typeof config.concurrency>) {
    setConfig((c) => ({ ...c, concurrency: { ...c.concurrency, ...p } }));
  }
  function patchIp(p: Partial<typeof config.ipSimulation>) {
    setConfig((c) => ({ ...c, ipSimulation: { ...c.ipSimulation, ...p } }));
  }
  function patchBrowser(p: Partial<typeof config.browserSimulation>) {
    setConfig((c) => ({ ...c, browserSimulation: { ...c.browserSimulation, ...p } }));
  }
  function patchNetwork(p: Partial<typeof config.networkSimulation>) {
    setConfig((c) => ({ ...c, networkSimulation: { ...c.networkSimulation, ...p } }));
  }

  function addGroup(preset: UserGroupPreset) {
    setConfig((c) => ({ ...c, userGroups: [...c.userGroups, createUserGroup(preset, 25)] }));
  }

  function handleStart() {
    if (!config.target.url && !config.target.apiBaseUrl) {
      toast.error("Enter a website URL or API base URL before starting the test.");
      return;
    }
    if (config.userGroups.length === 0) {
      toast.error("Add at least one virtual user group.");
      return;
    }
    start({ ...config, id: uuid(), createdAt: Date.now() });
    toast.success("Test started — streaming live metrics.");
    router.push("/live");
  }

  function toggleBrowser(b: BrowserType) {
    const has = config.browserSimulation.browsers.includes(b);
    patchBrowser({
      browsers: has
        ? config.browserSimulation.browsers.filter((x) => x !== b)
        : [...config.browserSimulation.browsers, b],
    });
  }
  function toggleDevice(d: DeviceType) {
    const has = config.browserSimulation.devices.includes(d);
    patchBrowser({
      devices: has
        ? config.browserSimulation.devices.filter((x) => x !== d)
        : [...config.browserSimulation.devices, d],
    });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <Input
            value={config.name}
            onChange={(e) => patch("name", e.target.value)}
            className="text-xl font-semibold h-auto px-0 border-none shadow-none focus-visible:ring-0"
          />
          <p className="text-sm text-muted-foreground">
            Configure your target, virtual users, and traffic model, then launch.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-xs text-muted-foreground">
            <div className="font-medium text-foreground">{totalUsers} virtual users</div>
            <div>{config.concurrency.testDurationSec}s duration</div>
          </div>
          <Button size="lg" className="gap-2" onClick={handleStart}>
            <Rocket className="size-4" /> Start test
          </Button>
        </div>
      </div>

      <Tabs defaultValue="target" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5">
          <TabsTrigger value="target">Target</TabsTrigger>
          <TabsTrigger value="users">User Groups</TabsTrigger>
          <TabsTrigger value="traffic">Traffic &amp; Concurrency</TabsTrigger>
          <TabsTrigger value="simulation">IP / Browser / Network</TabsTrigger>
          <TabsTrigger value="review">Review</TabsTrigger>
        </TabsList>

        <TabsContent value="target" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Target configuration</CardTitle>
              <CardDescription>Where the simulated traffic will be directed.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Website URL</Label>
                  <Input
                    placeholder="https://yourapp.com"
                    value={config.target.url}
                    onChange={(e) => patchTarget({ url: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>API base URL</Label>
                  <Input
                    placeholder="https://api.yourapp.com"
                    value={config.target.apiBaseUrl}
                    onChange={(e) => patchTarget({ apiBaseUrl: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>HTTP method</Label>
                  <Select
                    value={config.target.method}
                    onValueChange={(v) => v && patchTarget({ method: v as HttpMethod })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {METHODS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Environment</Label>
                  <Select
                    value={config.target.environment}
                    onValueChange={(v) => v && patchTarget({ environment: v as Environment })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ENVIRONMENTS.map((e) => (
                        <SelectItem key={e} value={e} className="capitalize">
                          {e}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Authorization token</Label>
                <Input
                  placeholder="Bearer ..."
                  value={config.target.authToken}
                  onChange={(e) => patchTarget({ authToken: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Cookies</Label>
                <Input
                  placeholder="session=...; theme=dark"
                  value={config.target.cookies}
                  onChange={(e) => patchTarget({ cookies: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Headers</Label>
                <KeyValueEditor items={config.target.headers} onChange={(v) => patchTarget({ headers: v })} />
              </div>
              <div className="space-y-1.5">
                <Label>Query parameters</Label>
                <KeyValueEditor
                  items={config.target.queryParams}
                  onChange={(v) => patchTarget({ queryParams: v })}
                  keyPlaceholder="param"
                  valuePlaceholder="value"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Request body</Label>
                <Textarea
                  placeholder='{"example": true}'
                  className="font-mono text-xs min-h-24"
                  value={config.target.requestBody}
                  onChange={(e) => patchTarget({ requestBody: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Users2 className="size-4" /> Virtual user groups
              </h3>
              <p className="text-xs text-muted-foreground">
                Every group simulates different real-user behavior instead of identical requests.
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Plus className="size-3.5" /> Add group
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                {Object.entries(USER_GROUP_LABELS).map(([value, label]) => (
                  <DropdownMenuItem key={value} onClick={() => addGroup(value as UserGroupPreset)}>
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="space-y-4">
            {config.userGroups.map((group) => (
              <UserGroupEditor
                key={group.id}
                group={group}
                onChange={(g) =>
                  setConfig((c) => ({
                    ...c,
                    userGroups: c.userGroups.map((x) => (x.id === g.id ? g : x)),
                  }))
                }
                onRemove={() =>
                  setConfig((c) => ({
                    ...c,
                    userGroups: c.userGroups.filter((x) => x.id !== group.id),
                  }))
                }
              />
            ))}
            {config.userGroups.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  No user groups yet — add one to define how virtual users behave.
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="traffic" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Traffic pattern</CardTitle>
              <CardDescription>How load ramps over the duration of the test.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(TRAFFIC_PATTERN_LABELS).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => patch("trafficPattern", value as TrafficPattern)}
                    className={`rounded-lg border px-3 py-3 text-xs font-medium text-left transition-colors ${
                      config.trafficPattern === value
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Concurrency &amp; duration</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Concurrent users</Label>
                <Input
                  type="number"
                  value={config.concurrency.concurrentUsers}
                  onChange={(e) => patchConcurrency({ concurrentUsers: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Requests / second</Label>
                <Input
                  type="number"
                  value={config.concurrency.requestsPerSecond}
                  onChange={(e) => patchConcurrency({ requestsPerSecond: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Max active sessions</Label>
                <Input
                  type="number"
                  value={config.concurrency.maxActiveSessions}
                  onChange={(e) => patchConcurrency({ maxActiveSessions: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Connection timeout (ms)</Label>
                <Input
                  type="number"
                  value={config.concurrency.connectionTimeoutMs}
                  onChange={(e) => patchConcurrency({ connectionTimeoutMs: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Retry attempts</Label>
                <Input
                  type="number"
                  value={config.concurrency.retryAttempts}
                  onChange={(e) => patchConcurrency({ retryAttempts: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Test duration (sec)</Label>
                <Input
                  type="number"
                  value={config.concurrency.testDurationSec}
                  onChange={(e) => patchConcurrency({ testDurationSec: Number(e.target.value) || 0 })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="simulation" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">IP simulation</CardTitle>
              <CardDescription>
                Simulated only — no real proxy traffic is generated in this build.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {IP_MODES.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => patchIp({ mode: m.value })}
                    className={`rounded-lg border px-3 py-2.5 text-xs font-medium text-left transition-colors ${
                      config.ipSimulation.mode === m.value
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">IP pool size</Label>
                  <Input
                    type="number"
                    value={config.ipSimulation.poolSize}
                    onChange={(e) => patchIp({ poolSize: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Geographic locations</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {COUNTRIES.map((c) => {
                      const active = config.ipSimulation.geoLocations.includes(c);
                      return (
                        <Badge
                          key={c}
                          variant={active ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() =>
                            patchIp({
                              geoLocations: active
                                ? config.ipSimulation.geoLocations.filter((x) => x !== c)
                                : [...config.ipSimulation.geoLocations, c],
                            })
                          }
                        >
                          {c}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Browser &amp; device simulation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Browsers</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(BROWSER_LABELS).map(([value, label]) => {
                    const active = config.browserSimulation.browsers.includes(value as BrowserType);
                    return (
                      <label
                        key={value}
                        className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs cursor-pointer ${
                          active ? "border-primary bg-primary/5" : "border-border"
                        }`}
                      >
                        <Checkbox checked={active} onCheckedChange={() => toggleBrowser(value as BrowserType)} />
                        {label}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Device types</Label>
                <div className="flex flex-wrap gap-2">
                  {DEVICE_TYPES.map((d) => {
                    const active = config.browserSimulation.devices.includes(d);
                    return (
                      <label
                        key={d}
                        className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs capitalize cursor-pointer ${
                          active ? "border-primary bg-primary/5" : "border-border"
                        }`}
                      >
                        <Checkbox checked={active} onCheckedChange={() => toggleDevice(d)} />
                        {d}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={config.browserSimulation.randomUserAgent}
                    onCheckedChange={(v) => patchBrowser({ randomUserAgent: !!v })}
                  />
                  Random user agent
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={config.browserSimulation.randomResolution}
                    onCheckedChange={(v) => patchBrowser({ randomResolution: !!v })}
                  />
                  Random screen resolution
                </label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Network simulation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(NETWORK_PROFILE_LABELS).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => patchNetwork({ profile: value as NetworkProfile })}
                    className={`rounded-lg border px-3 py-2.5 text-xs font-medium text-left transition-colors ${
                      config.networkSimulation.profile === value
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Review &amp; launch</CardTitle>
              <CardDescription>Double-check the configuration below, then start the test.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ReviewRow label="Target" value={config.target.url || config.target.apiBaseUrl || "—"} />
              <ReviewRow label="Method" value={config.target.method} />
              <ReviewRow label="Environment" value={config.target.environment} />
              <ReviewRow
                label="User groups"
                value={config.userGroups.map((g) => `${g.name} (${g.users})`).join(", ") || "—"}
              />
              <ReviewRow label="Total virtual users" value={String(totalUsers)} />
              <ReviewRow label="Traffic pattern" value={TRAFFIC_PATTERN_LABELS[config.trafficPattern]} />
              <ReviewRow label="Duration" value={`${config.concurrency.testDurationSec}s`} />
              <ReviewRow label="Concurrent users limit" value={String(config.concurrency.concurrentUsers)} />
              <ReviewRow label="IP simulation" value={config.ipSimulation.mode.replace("_", " ")} />
              <ReviewRow label="Network profile" value={NETWORK_PROFILE_LABELS[config.networkSimulation.profile]} />
              <div className="pt-4">
                <Button size="lg" className="gap-2" onClick={handleStart}>
                  <Rocket className="size-4" /> Start test
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-1.5 last:border-none">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%] truncate capitalize">{value}</span>
    </div>
  );
}
