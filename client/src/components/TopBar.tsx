import * as React from "react";
import { PackagePlus } from "lucide-react";
import { cn } from "@/lib/utils";

export function TopBar({
  title = "",
  subtitle,
  className,
}: {
  title?: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="space-y-1">
        <div className="inline-flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl border border-card-border bg-card shadow-sm">
            <PackagePlus className="h-5 w-5 text-foreground" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        </div>
        {subtitle ? (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}
