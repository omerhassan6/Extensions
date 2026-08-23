"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Gauge,
  History,
  LayoutDashboard,
  PlusCircle,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { useTestRunStore } from "@/lib/test-run-store";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/new", label: "New Test", icon: PlusCircle },
  { href: "/live", label: "Live Dashboard", icon: Activity },
  { href: "/history", label: "Test History", icon: History },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const status = useTestRunStore((s) => s.status);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2 px-5 h-16 border-b border-sidebar-border">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="size-4" />
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-sm">LoadForge</div>
            <div className="text-[11px] text-muted-foreground">Performance QA Platform</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="size-4" />
                {item.label}
                {item.href === "/live" && status === "running" && (
                  <span className="ml-auto flex size-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <Gauge className="size-3.5" />
            Simulated engine &middot; v0.1 MVP
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex h-16 items-center justify-between border-b border-border px-4 md:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <Zap className="size-5" />
            <span className="font-semibold text-sm">LoadForge</span>
          </div>
          <div className="hidden md:block text-sm text-muted-foreground">
            {status === "running" ? (
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                Test running
              </Badge>
            ) : (
              "Ready to test"
            )}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
        <nav className="md:hidden flex items-center justify-around border-t border-border h-14 bg-background">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center text-[10px] gap-0.5 flex-1 h-full",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
