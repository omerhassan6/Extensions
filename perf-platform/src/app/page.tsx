"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  Gauge,
  Globe2,
  History,
  LineChart,
  ShieldAlert,
  Users,
  Zap,
} from "lucide-react";
import { LinkButton } from "@/components/link-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loadHistory } from "@/lib/storage";
import { Badge } from "@/components/ui/badge";

const FEATURES = [
  {
    icon: Users,
    title: "Realistic user simulation",
    desc: "Model Slow, Fast, Heavy, Returning and Guest users with distinct behaviors instead of hammering one endpoint.",
  },
  {
    icon: LineChart,
    title: "Live metrics & charts",
    desc: "Response time percentiles, RPS, error rate, and resource usage refreshing every second while your test runs.",
  },
  {
    icon: Globe2,
    title: "Traffic, IP & network modeling",
    desc: "Traffic patterns, geo-distributed IPs, browser/device mix, and network conditions like latency or packet loss.",
  },
  {
    icon: ShieldAlert,
    title: "Bottleneck detection",
    desc: "Automatically surface timeouts, rate limits, 5xx spikes, and tail-latency issues with actionable recommendations.",
  },
];

export default function OverviewPage() {
  const [history, setHistory] = useState<ReturnType<typeof loadHistory>>([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const recentTests = history.slice(0, 4);

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6 py-8 md:py-12 space-y-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <Badge variant="secondary" className="gap-1.5">
            <Zap className="size-3" /> Simulated load engine
          </Badge>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Performance, load & concurrency testing for QA teams
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            Configure realistic virtual user behavior, launch a test against your
            website or API, and watch bottlenecks surface in real time — before
            your users find them.
          </p>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <LinkButton href="/new" size="lg" className="gap-2">
            Create a test <ArrowRight className="size-4" />
          </LinkButton>
          <LinkButton href="/history" variant="outline" size="lg">
            View test history
          </LinkButton>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {FEATURES.map((f) => (
          <Card key={f.title} className="border-border/80">
            <CardHeader className="pb-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary mb-1">
                <f.icon className="size-4.5" />
              </div>
              <CardTitle className="text-sm">{f.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-xs leading-relaxed">{f.desc}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <History className="size-4.5 text-muted-foreground" /> Recent tests
          </h2>
          <LinkButton href="/history" variant="ghost" size="sm">
            View all
          </LinkButton>
        </div>
        {recentTests.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 flex flex-col items-center text-center gap-3">
              <Gauge className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground max-w-sm">
                No tests run yet. Create your first performance test to see live
                metrics, charts, and a downloadable report here.
              </p>
              <LinkButton href="/new" size="sm">
                Create your first test
              </LinkButton>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentTests.map((entry) => (
              <Card key={entry.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm truncate">{entry.config.name}</CardTitle>
                  <CardDescription className="text-xs truncate">
                    {entry.config.target.url || entry.config.target.apiBaseUrl || "No URL set"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-1">
                  <div>Avg response: {entry.report.avgResponseTime}ms</div>
                  <div>Peak RPS: {entry.report.peakRps}</div>
                  <div>
                    Success:{" "}
                    {Math.round(
                      (entry.report.successCount / Math.max(1, entry.report.totalRequests)) * 100
                    )}
                    %
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
