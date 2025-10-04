"use client";

import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  label?: string;
}

export function ProgressBar({
  value,
  max = 1,
  className,
  label,
}: ProgressBarProps) {
  const normalized = max <= 0 ? 0 : Math.min(Math.max(value / max, 0), 1);

  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-200 ease-out"
          style={{ width: `${normalized * 100}%` }}
        />
      </div>
    </div>
  );
}
