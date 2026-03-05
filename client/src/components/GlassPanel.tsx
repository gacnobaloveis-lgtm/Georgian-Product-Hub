import * as React from "react";
import { cn } from "@/lib/utils";

export function GlassPanel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "grain rounded-2xl border border-card-border bg-card/70 backdrop-blur-xl",
        "shadow-[0_18px_60px_hsl(220_40%_2%_/_0.10)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
