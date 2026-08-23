"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  Download,
  History as HistoryIcon,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/link-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HistoryEntry } from "@/lib/types";
import { deleteHistoryEntry, loadHistory, setDraftConfig } from "@/lib/storage";
import { useTestRunStore } from "@/lib/test-run-store";
import { exportReportJson } from "@/lib/export";
import { toast } from "sonner";

export default function HistoryPage() {
  const router = useRouter();
  const [entries, setEntries] = React.useState<HistoryEntry[]>([]);
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [compareIds, setCompareIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    setEntries(loadHistory());
  }, []);

  const filtered = entries.filter((e) => {
    const matchesQuery =
      !query ||
      e.config.name.toLowerCase().includes(query.toLowerCase()) ||
      e.config.target.url.toLowerCase().includes(query.toLowerCase()) ||
      e.config.target.apiBaseUrl.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === "all" || e.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  function handleDelete(id: string) {
    deleteHistoryEntry(id);
    setEntries(loadHistory());
    setCompareIds((c) => c.filter((x) => x !== id));
    toast.success("Test deleted from history.");
  }

  function handleView(entry: HistoryEntry) {
    useTestRunStore.setState({
      config: entry.config,
      report: entry.report,
      series: entry.report.series,
      logs: entry.report.logs,
      status: entry.status,
      elapsedSec: entry.report.durationSec,
    });
    router.push("/report");
  }

  function handleClone(entry: HistoryEntry) {
    setDraftConfig({ ...entry.config, name: `${entry.config.name} (clone)` });
    router.push("/new");
  }

  function toggleCompare(id: string) {
    setCompareIds((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length < 3 ? [...c, id] : c));
  }

  const compareEntries = entries.filter((e) => compareIds.includes(e.id));

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <HistoryIcon className="size-5" /> Test history
          </h1>
          <p className="text-sm text-muted-foreground">
            {entries.length} test{entries.length === 1 ? "" : "s"} saved locally in this browser.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by name or URL"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8 w-56"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="stopped">Stopped</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {compareEntries.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Comparing {compareEntries.length} tests</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setCompareIds([])} className="gap-1">
              <X className="size-3.5" /> Clear
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="py-1 pr-4">Test</th>
                    <th className="py-1 pr-4">Avg response</th>
                    <th className="py-1 pr-4">P95</th>
                    <th className="py-1 pr-4">Peak RPS</th>
                    <th className="py-1 pr-4">Success rate</th>
                    <th className="py-1 pr-4">Failures</th>
                  </tr>
                </thead>
                <tbody>
                  {compareEntries.map((e) => (
                    <tr key={e.id} className="border-t border-border/60">
                      <td className="py-2 pr-4 font-medium">{e.config.name}</td>
                      <td className="py-2 pr-4">{e.report.avgResponseTime}ms</td>
                      <td className="py-2 pr-4">{e.report.p95}ms</td>
                      <td className="py-2 pr-4">{e.report.peakRps}</td>
                      <td className="py-2 pr-4">
                        {Math.round(
                          (e.report.successCount / Math.max(1, e.report.totalRequests)) * 100
                        )}
                        %
                      </td>
                      <td className="py-2 pr-4">{e.report.failureCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 flex flex-col items-center text-center gap-3">
            <HistoryIcon className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground max-w-sm">
              {entries.length === 0
                ? "No tests have been run yet."
                : "No tests match your search/filter."}
            </p>
            <LinkButton href="/new" size="sm">
              Create a test
            </LinkButton>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((entry) => (
            <Card key={entry.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm truncate">{entry.config.name}</CardTitle>
                  <Badge variant={entry.status === "completed" ? "secondary" : "outline"}>
                    {entry.status}
                  </Badge>
                </div>
                <CardDescription className="text-xs truncate">
                  {entry.config.target.url || entry.config.target.apiBaseUrl}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Metric label="Avg" value={`${entry.report.avgResponseTime}ms`} />
                  <Metric label="P95" value={`${entry.report.p95}ms`} />
                  <Metric label="Peak RPS" value={String(entry.report.peakRps)} />
                  <Metric
                    label="Success"
                    value={`${Math.round(
                      (entry.report.successCount / Math.max(1, entry.report.totalRequests)) * 100
                    )}%`}
                  />
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {new Date(entry.report.finishedAt).toLocaleString()}
                </div>
                <div className="mt-auto flex items-center gap-1.5 flex-wrap pt-1">
                  <Button size="sm" variant="outline" onClick={() => handleView(entry)}>
                    View report
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-1" onClick={() => handleClone(entry)}>
                    <Copy className="size-3.5" /> Clone
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1"
                    onClick={() => exportReportJson(entry.report)}
                  >
                    <Download className="size-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant={compareIds.includes(entry.id) ? "default" : "ghost"}
                    onClick={() => toggleCompare(entry.id)}
                  >
                    Compare
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto text-muted-foreground"
                    onClick={() => handleDelete(entry.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/50 px-2 py-1.5">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
