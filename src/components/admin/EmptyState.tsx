import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Inbox } from "lucide-react";

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 border-dashed bg-muted/30 px-6 py-14 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-background text-muted-foreground shadow-sm">
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </Card>
  );
}
