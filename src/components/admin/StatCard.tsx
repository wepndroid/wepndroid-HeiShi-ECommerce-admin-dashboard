import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

type Trend = { value: string; direction: "up" | "down" | "flat"; tone?: "good" | "bad" | "neutral" };

export function StatCard({
  label,
  value,
  icon,
  trend,
  hint,
  accent,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  trend?: Trend;
  hint?: string;
  accent?: "primary" | "success" | "warning" | "danger" | "info";
}) {
  const TrendIcon = trend
    ? trend.direction === "up"
      ? ArrowUpRight
      : trend.direction === "down"
        ? ArrowDownRight
        : Minus
    : null;
  const trendTone =
    trend?.tone === "good"
      ? "text-success-foreground dark:text-success"
      : trend?.tone === "bad"
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <Card className="relative overflow-hidden border-border/70 bg-card p-4 shadow-[var(--shadow-card)] transition-colors hover:border-border">
      {accent ? (
        <span className="absolute inset-y-0 left-0 w-1 bg-[#7AD80B]" aria-hidden />
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        {icon ? (
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
            {icon}
          </span>
        ) : null}
      </div>
      <div className="mt-3 text-[28px] font-semibold leading-none tracking-tight text-foreground tabular-nums">{value}</div>
      <div className="mt-2.5 flex items-center gap-2 text-xs">
        {TrendIcon && trend ? (
          <span className={cn("inline-flex items-center gap-0.5 font-medium tabular-nums", trendTone)}>
            <TrendIcon className="h-3 w-3" />
            {trend.value}
          </span>
        ) : null}
        {hint ? <span className="text-muted-foreground">{hint}</span> : null}
      </div>
    </Card>
  );
}
