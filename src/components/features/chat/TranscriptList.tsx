"use client";

import { useEffect, useRef } from "react";
import {
  ConnectionState,
  TranscriptItem,
} from "@/lib/stores/realtimeSessionStore";
import { cn } from "@/lib/utils";

interface TranscriptListProps {
  transcripts: TranscriptItem[];
  connectionState: ConnectionState;
  captionsEnabled: boolean;
}

export function TranscriptList({
  transcripts,
  connectionState,
  captionsEnabled,
}: TranscriptListProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    if (captionsEnabled) {
      container.scrollTop = container.scrollHeight;
    }
  }, [transcripts, captionsEnabled]);

  return (
    <div className="flex h-64 flex-col overflow-hidden rounded-lg border bg-background/50">
      <div className="border-b px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Live transcript {captionsEnabled ? "" : "(captions hidden)"}
      </div>
      <div
        ref={scrollRef}
        className={cn(
          "flex-1 space-y-3 overflow-y-auto px-4 py-3 transition-opacity",
          captionsEnabled
            ? "opacity-100"
            : "pointer-events-none select-none opacity-40"
        )}
      >
        {transcripts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {connectionState === "connected"
              ? "Waiting for conversation to begin..."
              : "Start a session to see the conversation transcript."}
          </p>
        ) : (
          transcripts.map((item) => (
            <div
              key={item.id}
              className={cn(
                "rounded-md border p-3 text-sm shadow-sm",
                item.speaker === "companion"
                  ? "border-primary/30 bg-primary/10"
                  : item.speaker === "user"
                  ? "border-muted bg-muted/50"
                  : "border-amber-200 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10"
              )}
            >
              <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span>{item.speaker}</span>
                <time dateTime={item.timestamp}>
                  {new Date(item.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>
              <p className="text-sm leading-relaxed text-foreground">
                {item.content}
              </p>
              {item.annotations && item.annotations.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {item.annotations.map((note, idx) => (
                    <li key={idx}>• {note}</li>
                  ))}
                </ul>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
