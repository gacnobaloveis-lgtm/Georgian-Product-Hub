import * as React from "react";
import { cn } from "@/lib/utils";

export function AnimatedShell({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("animate-in-soft", className)}>
      {children}
    </div>
  );
}
