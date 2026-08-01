import { TestReport } from "./types";

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportReportJson(report: TestReport) {
  download(
    `${report.configName.replace(/\s+/g, "-").toLowerCase()}-report.json`,
    JSON.stringify(report, null, 2),
    "application/json"
  );
}

export function exportReportCsv(report: TestReport) {
  const header = [
    "timestamp",
    "virtualUser",
    "ip",
    "browser",
    "country",
    "endpoint",
    "method",
    "statusCode",
    "responseTimeMs",
    "responseSizeKb",
    "retryCount",
  ];
  const rows = report.logs.map((l) =>
    [
      new Date(l.timestamp).toISOString(),
      l.virtualUser,
      l.ip,
      l.browser,
      l.country,
      l.endpoint,
      l.method,
      l.statusCode,
      l.responseTimeMs,
      l.responseSizeKb,
      l.retryCount,
    ].join(",")
  );
  download(
    `${report.configName.replace(/\s+/g, "-").toLowerCase()}-logs.csv`,
    [header.join(","), ...rows].join("\n"),
    "text/csv"
  );
}

export function exportReportSummaryText(report: TestReport): string {
  return `Performance Test Report
========================
Test: ${report.configName}
Target: ${report.targetUrl}
Duration: ${report.durationSec}s
Total Requests: ${report.totalRequests}
Success: ${report.successCount} | Failures: ${report.failureCount}
Avg Response Time: ${report.avgResponseTime}ms
P95: ${report.p95}ms | P99: ${report.p99}ms
Min/Max: ${report.minResponseTime}ms / ${report.maxResponseTime}ms
Peak RPS: ${report.peakRps}
Peak Concurrent Users: ${report.peakConcurrentUsers}
Timeouts: ${report.timeoutCount} | Connection Errors: ${report.connectionErrors}

Slowest Endpoints:
${report.slowestEndpoints.map((e) => `  ${e.endpoint} - ${e.avgResponseTime}ms (${e.count} reqs)`).join("\n")}

Recommendations:
${report.recommendations.map((r) => `  - ${r}`).join("\n")}
`;
}
