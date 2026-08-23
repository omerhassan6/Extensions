"use client";

import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileJson,
  FileText,
  Lightbulb,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/link-button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LiveAreaChart } from "@/components/dashboard/live-chart";
import { useTestRunStore } from "@/lib/test-run-store";
import { exportReportCsv, exportReportJson } from "@/lib/export";

export default function ReportPage() {
  const { report, config } = useTestRunStore();

  if (!report || !config) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center space-y-4">
        <FileText className="mx-auto size-10 text-muted-foreground" />
        <h2 className="text-lg font-semibold">No report available</h2>
        <p className="text-sm text-muted-foreground">
          Run a test to generate a performance report, or check your test history.
        </p>
        <div className="flex justify-center gap-2">
          <LinkButton href="/history" variant="outline">
            Test history
          </LinkButton>
          <LinkButton href="/new">Create a test</LinkButton>
        </div>
      </div>
    );
  }

  const successPct = Math.round((report.successCount / Math.max(1, report.totalRequests)) * 100);
  const chartData = report.series.map((s) => ({
    t: s.t,
    avg: s.avgResponseTime,
    p95: s.p95,
    p99: s.p99,
    rps: s.rps,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{report.configName} — Report</h1>
          <p className="text-sm text-muted-foreground truncate max-w-md">{report.targetUrl}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportReportJson(report)}>
            <FileJson className="size-3.5" /> Export JSON
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportReportCsv(report)}>
            <Download className="size-3.5" /> Export CSV
          </Button>
          <LinkButton href="/new" size="sm" className="gap-1.5">
            <Rocket className="size-3.5" /> New test
          </LinkButton>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Stat label="Total requests" value={report.totalRequests.toLocaleString()} />
        <Stat label="Success rate" value={`${successPct}%`} tone={successPct >= 95 ? "success" : "warning"} />
        <Stat label="Avg response" value={`${report.avgResponseTime}ms`} />
        <Stat label="P95 / P99" value={`${report.p95} / ${report.p99}ms`} />
        <Stat label="Peak RPS" value={report.peakRps.toLocaleString()} />
        <Stat label="Duration" value={`${report.durationSec}s`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LiveAreaChart
          title="Response time over test duration"
          data={chartData}
          unit="ms"
          series={[
            { key: "avg", label: "Avg", color: "#3b82f6" },
            { key: "p95", label: "P95", color: "#f59e0b" },
            { key: "p99", label: "P99", color: "#ef4444" },
          ]}
        />
        <LiveAreaChart
          title="Requests per second over test duration"
          data={chartData}
          series={[{ key: "rps", label: "RPS", color: "#22c55e" }]}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Slowest endpoints</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {report.slowestEndpoints.map((e) => (
              <EndpointRow key={e.endpoint} endpoint={e.endpoint} value={`${e.avgResponseTime}ms`} sub={`${e.count} reqs`} tone="danger" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fastest endpoints</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {report.fastestEndpoints.map((e) => (
              <EndpointRow key={e.endpoint} endpoint={e.endpoint} value={`${e.avgResponseTime}ms`} sub={`${e.count} reqs`} tone="success" />
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="size-4" /> Error &amp; timeout analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Failed requests" value={report.failureCount.toLocaleString()} />
            <Row label="Timeouts" value={report.timeoutCount.toLocaleString()} />
            <Row label="Connection errors" value={report.connectionErrors.toLocaleString()} />
            <div className="pt-2">
              <div className="text-xs text-muted-foreground mb-1.5">Status code distribution</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(report.statusCodeDistribution).map(([code, count]) => (
                  <Badge key={code} variant={Number(code) >= 400 ? "destructive" : "secondary"}>
                    {code}: {count.toLocaleString()}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="size-4" /> Recommendations
            </CardTitle>
            <CardDescription>Generated from this test&apos;s observed metrics.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5">
              {report.recommendations.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="size-4 mt-0.5 text-primary shrink-0" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "success" | "warning" }) {
  return (
    <Card className="border-border/80">
      <CardContent className="py-3 px-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div
          className={`text-xl font-semibold mt-0.5 ${
            tone === "success"
              ? "text-emerald-600 dark:text-emerald-400"
              : tone === "warning"
              ? "text-amber-600 dark:text-amber-400"
              : ""
          }`}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border/60 py-1.5 last:border-none">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function EndpointRow({
  endpoint,
  value,
  sub,
  tone,
}: {
  endpoint: string;
  value: string;
  sub: string;
  tone: "success" | "danger";
}) {
  return (
    <div className="flex items-center justify-between text-sm border-b border-border/60 py-2 last:border-none">
      <span className="font-mono text-xs truncate max-w-[55%]">{endpoint}</span>
      <div className="text-right">
        <div className={tone === "success" ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-red-600 dark:text-red-400 font-medium"}>
          {value}
        </div>
        <div className="text-[11px] text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}
