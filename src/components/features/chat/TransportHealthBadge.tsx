"use client";

import {
  ConnectionState,
  TransportType,
} from "@/lib/stores/realtimeSessionStore";
import { cn } from "@/lib/utils";

interface TransportHealthBadgeProps {
  connectionState: ConnectionState;
  transport: TransportType;
}

const CONNECTION_COPY: Record<
  ConnectionState,
  { label: string; tone: "green" | "yellow" | "red" }
> = {
  connected: { label: "Connected", tone: "green" },
  connecting: { label: "Connecting", tone: "yellow" },
  reconnecting: { label: "Reconnecting", tone: "yellow" },
  disconnected: { label: "Disconnected", tone: "red" },
};

export function TransportHealthBadge({
  connectionState,
  transport,
}: TransportHealthBadgeProps) {
  const copy = CONNECTION_COPY[connectionState] ?? CONNECTION_COPY.disconnected;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide",
        copy.tone === "green" &&
          "border-emerald-400 bg-emerald-400/10 text-emerald-600",
        copy.tone === "yellow" &&
          "border-amber-300 bg-amber-200/20 text-amber-600",
        copy.tone === "red" && "border-rose-300 bg-rose-200/20 text-rose-600"
      )}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
      {copy.label}
      <span className="text-[10px] uppercase text-muted-foreground">
        {transport}
      </span>
    </span>
  );
}
