"use client";

import {
  ConnectionState,
  MicrophoneState,
} from "@/lib/stores/realtimeSessionStore";
import { cn } from "@/lib/utils";

interface AudioVisualizerProps {
  energy: number;
  microphoneState: MicrophoneState;
  connectionState: ConnectionState;
}

export function AudioVisualizer({
  energy,
  microphoneState,
  connectionState,
}: AudioVisualizerProps) {
  const clampedEnergy = Math.min(Math.max(energy, 0), 1);
  const barCount = 16;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
        <span>Audio activity</span>
        <span className="font-semibold">
          {microphoneState === "muted"
            ? "Microphone muted"
            : connectionState !== "connected"
            ? "Awaiting connection"
            : "Streaming"}
        </span>
      </div>
      <div
        className={cn(
          "flex h-16 items-end gap-1 rounded-md border bg-background/60 p-2",
          microphoneState === "muted" && "opacity-60"
        )}
      >
        {Array.from({ length: barCount }).map((_, index) => {
          const normalized = (index + 1) / barCount;
          const height = Math.max(0.15, clampedEnergy - (1 - normalized));
          return (
            <span
              key={index}
              className={cn(
                "flex-1 rounded-sm bg-primary/50 transition-all duration-150 ease-out",
                connectionState === "connected" ? "bg-primary" : "bg-muted"
              )}
              style={{
                height: `${Math.round(height * 100)}%`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
