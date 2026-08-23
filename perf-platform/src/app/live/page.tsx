"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Clock,
  Gauge,
  Globe,
  Server,
  Square,
  TimerOff,
  Users,
  Wifi,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/link-button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MetricTile } from "@/components/dashboard/metric-tile";
import { LiveAreaChart, LiveLineChart } from "@/components/dashboard/live-chart";
import { useTestRunStore } from "@/lib/test-run-store";

export default function LiveDashboardPage() {
  const router = useRouter();
  const { config, status, elapsedSec, series, logs, stop } = useTestRunStore();

  if (!config) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center space-y-4">
        <Activity className="mx-auto size-10 text-muted-foreground" />
        <h2 className="text-lg font-semibold">No test running</h2>
        <p className="text-sm text-muted-foreground">
          Start a new performance test to see live metrics here.
        </p>
        <LinkButton href="/new">Create a test</LinkButton>
      </div>
    );
  }

  const latest = series[series.length - 1];
  const duration = config.concurrency.testDurationSec;
  const progressPct = Math.min(100, Math.round((elapsedSec / duration) * 100));

  const chartData = series.map((s) => ({
    t: s.t,
    rps: s.rps,
    avg: s.avgResponseTime,
    p95: s.p95,
    p99: s.p99,
    concurrentUsers: s.concurrentUsers,
    activeUsers: s.activeUsers,
    cpu: s.cpuUsage,
    memory: s.memoryUsage,
    errorRate: Math.round(s.errorRate * 10) / 10,
    bandwidth: s.bandwidthKbps,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-6 py-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{config.name}</h1>
            <StatusBadge status={status} />
          </div>
          <p className="text-sm text-muted-foreground truncate max-w-md">
            {config.target.url || config.target.apiBaseUrl}
          </p>
        </div>
        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="flex-1 lg:w-64">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{elapsedSec}s elapsed</span>
              <span>{duration}s total</span>
            </div>
            <Progress value={progressPct} />
          </div>
          {status === "running" ? (
            <Button variant="destructive" onClick={() => stop()} className="gap-1.5 shrink-0">
              <Square className="size-3.5" /> Stop test
            </Button>
          ) : (
            <Button onClick={() => router.push("/report")} className="gap-1.5 shrink-0">
              View report <ArrowRight className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      {status !== "running" && series.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-3 flex items-center justify-between gap-3 flex-wrap">
            <span className="text-sm">
              Test {status === "completed" ? "completed" : "stopped"}. View the full report with
              recommendations and export options.
            </span>
            <Button size="sm" onClick={() => router.push("/report")} className="gap-1.5">
              View report <ArrowRight className="size-3.5" />
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricTile label="Active users" value={latest?.activeUsers ?? 0} icon={Users} />
        <MetricTile label="Concurrent users" value={latest?.concurrentUsers ?? 0} icon={Users} />
        <MetricTile label="Requests / sec" value={latest?.rps ?? 0} icon={Activity} />
        <MetricTile
          label="Avg response"
          value={latest?.avgResponseTime ?? 0}
          unit="ms"
          icon={Clock}
        />
        <MetricTile label="P95 latency" value={latest?.p95 ?? 0} unit="ms" icon={Gauge} />
        <MetricTile label="P99 latency" value={latest?.p99 ?? 0} unit="ms" icon={Gauge} />
        <MetricTile
          label="Success rate"
          value={latest ? latest.successRate.toFixed(1) : "0"}
          unit="%"
          icon={Wifi}
          tone="success"
        />
        <MetricTile
          label="Failure rate"
          value={latest ? latest.failureRate.toFixed(1) : "0"}
          unit="%"
          icon={XCircle}
          tone={latest && latest.failureRate > 5 ? "danger" : "default"}
        />
        <MetricTile
          label="Timeouts"
          value={latest?.timeoutCount ?? 0}
          icon={TimerOff}
          tone={latest && latest.timeoutCount > 0 ? "warning" : "default"}
        />
        <MetricTile
          label="Connection errors"
          value={latest?.connectionErrors ?? 0}
          icon={AlertTriangle}
          tone={latest && latest.connectionErrors > 0 ? "warning" : "default"}
        />
        <MetricTile label="Server errors (5xx)" value={latest?.serverErrorCount ?? 0} icon={Server} />
        <MetricTile
          label="Unique IPs"
          value={latest?.uniqueIps ?? 0}
          icon={Globe}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LiveAreaChart
          title="Response time (avg / p95 / p99)"
          data={chartData}
          unit="ms"
          series={[
            { key: "avg", label: "Avg", color: "#3b82f6" },
            { key: "p95", label: "P95", color: "#f59e0b" },
            { key: "p99", label: "P99", color: "#ef4444" },
          ]}
        />
        <LiveAreaChart
          title="Requests per second"
          data={chartData}
          series={[{ key: "rps", label: "RPS", color: "#22c55e" }]}
        />
        <LiveAreaChart
          title="Concurrent &amp; active users"
          data={chartData}
          series={[
            { key: "concurrentUsers", label: "Concurrent", color: "#8b5cf6" },
            { key: "activeUsers", label: "Active", color: "#06b6d4" },
          ]}
        />
        <LiveLineChart
          title="Error rate"
          data={chartData}
          unit="%"
          series={[{ key: "errorRate", label: "Error rate", color: "#ef4444" }]}
        />
        <LiveAreaChart
          title="CPU &amp; memory usage"
          data={chartData}
          unit="%"
          series={[
            { key: "cpu", label: "CPU", color: "#f97316" },
            { key: "memory", label: "Memory", color: "#3b82f6" },
          ]}
        />
        <LiveAreaChart
          title="Network throughput"
          data={chartData}
          unit=" kbps"
          series={[{ key: "bandwidth", label: "Bandwidth", color: "#14b8a6" }]}
        />
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Live request log</h3>
            <span className="text-xs text-muted-foreground">{logs.length} sampled requests</span>
          </div>
          <ScrollArea className="h-72 rounded-md border border-border">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Virtual user</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Browser</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Time (ms)</TableHead>
                  <TableHead className="text-right">Size (KB)</TableHead>
                  <TableHead className="text-right">Retries</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.slice(0, 100).map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </TableCell>
                    <TableCell className="text-xs">{log.virtualUser}</TableCell>
                    <TableCell className="text-xs font-mono">{log.ip}</TableCell>
                    <TableCell className="text-xs">{log.browser}</TableCell>
                    <TableCell className="text-xs">{log.country}</TableCell>
                    <TableCell className="text-xs font-mono">{log.endpoint}</TableCell>
                    <TableCell className="text-xs">{log.method}</TableCell>
                    <TableCell>
                      <Badge
                        variant={log.statusCode >= 400 ? "destructive" : "secondary"}
                        className="text-[10px]"
                      >
                        {log.statusCode}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums">
                      {log.responseTimeMs}
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums">
                      {log.responseSizeKb}
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums">
                      {log.retryCount}
                    </TableCell>
                  </TableRow>
                ))}
                {logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-sm text-muted-foreground py-8">
                      Waiting for the first requests...
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "running")
    return (
      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1">
        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Running
      </Badge>
    );
  if (status === "completed")
    return <Badge variant="secondary">Completed</Badge>;
  if (status === "stopped")
    return <Badge variant="outline">Stopped</Badge>;
  return null;
}
