import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function DataTable({
  children,
  footer,
  className,
}: {
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden border-border/70 p-0 shadow-none", className)}>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">{children}</table>
      </div>
      {footer ? (
        <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
          {footer}
        </div>
      ) : null}
    </Card>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      <tr>{children}</tr>
    </thead>
  );
}

export function TH({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th className={cn("h-9 border-b border-border px-4 text-left font-semibold first:rounded-tl-md last:rounded-tr-md", className)}>
      {children}
    </th>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TR({ children, className }: { children: ReactNode; className?: string }) {
  return <tr className={cn("group transition-colors hover:bg-muted/30", className)}>{children}</tr>;
}

export function TD({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <td className={cn("whitespace-nowrap border-b border-border/60 px-4 py-2.5 align-middle text-[13px] text-foreground", className)}>
      {children}
    </td>
  );
}
