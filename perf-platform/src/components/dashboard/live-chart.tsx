"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface Series {
  key: string;
  label: string;
  color: string;
}

export function LiveAreaChart({
  title,
  data,
  series,
  unit,
}: {
  title: string;
  data: Record<string, number | string>[];
  series: Series[];
  unit?: string;
}) {
  return (
    <Card className="border-border/80">
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-[220px] pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              {series.map((s) => (
                <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={s.color} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis dataKey="t" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={36} />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--card-foreground)",
              }}
              formatter={(value, name) => [
                `${value}${unit ? unit : ""}`,
                series.find((s) => s.key === name)?.label ?? String(name),
              ]}
              labelFormatter={(l) => `t = ${l}s`}
            />
            {series.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={s.color}
                fill={`url(#grad-${s.key})`}
                strokeWidth={2}
                isAnimationActive={false}
                dot={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function LiveLineChart({
  title,
  data,
  series,
  unit,
}: {
  title: string;
  data: Record<string, number | string>[];
  series: Series[];
  unit?: string;
}) {
  return (
    <Card className="border-border/80">
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-[220px] pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis dataKey="t" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={36} />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--card-foreground)",
              }}
              formatter={(value, name) => [
                `${value}${unit ? unit : ""}`,
                series.find((s) => s.key === name)?.label ?? String(name),
              ]}
              labelFormatter={(l) => `t = ${l}s`}
            />
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={2}
                isAnimationActive={false}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
