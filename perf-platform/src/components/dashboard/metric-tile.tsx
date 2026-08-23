import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricTile({
  label,
  value,
  unit,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon?: LucideIcon;
  tone?: "default" | "success" | "danger" | "warning";
}) {
  return (
    <Card className="border-border/80">
      <CardContent className="py-4 px-4 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground truncate">{label}</div>
          <div
            className={cn(
              "text-2xl font-semibold tabular-nums tracking-tight mt-1",
              tone === "success" && "text-emerald-600 dark:text-emerald-400",
              tone === "danger" && "text-red-600 dark:text-red-400",
              tone === "warning" && "text-amber-600 dark:text-amber-400"
            )}
          >
            {value}
            {unit && <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>}
          </div>
        </div>
        {Icon && (
          <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground shrink-0">
            <Icon className="size-4" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
