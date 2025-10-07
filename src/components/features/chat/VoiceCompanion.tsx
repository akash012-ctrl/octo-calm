"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, FileText, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRealtimeSessionStore } from "@/lib/stores/realtimeSessionStore";
import { SessionControls } from "./SessionControls";
import { TranscriptList } from "./TranscriptList";
import { AudioVisualizer } from "./AudioVisualizer";
import { TransportHealthBadge } from "./TransportHealthBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface VoiceCompanionProps {
  className?: string;
  autoStart?: boolean;
  locale?: string;
  voice?: string;
}

export function VoiceCompanion({
  className,
  autoStart = false,
  locale = "en-US",
  voice = "alloy",
}: VoiceCompanionProps) {
  const [hasAttemptedStart, setHasAttemptedStart] = useState(false);
  const sessionId = useRealtimeSessionStore((state) => state.sessionId);
  const connectionState = useRealtimeSessionStore(
    (state) => state.connectionState
  );
  const transport = useRealtimeSessionStore((state) => state.transport);
  const sessionMeta = useMemo(
    () => ({ sessionId, connectionState, transport }),
    [sessionId, connectionState, transport]
  );
  const transcripts = useRealtimeSessionStore((state) => state.transcripts);
  const audioEnergy = useRealtimeSessionStore((state) => state.audioEnergy);
  const isInitializing = useRealtimeSessionStore(
    (state) => state.isInitializing
  );
  const microphoneState = useRealtimeSessionStore(
    (state) => state.microphoneState
  );
  const captionsEnabled = useRealtimeSessionStore(
    (state) => state.captionsEnabled
  );
  const toggleCaptions = useRealtimeSessionStore(
    (state) => state.toggleCaptions
  );
  const isAgentTyping = useRealtimeSessionStore((state) => state.isAgentTyping);
  const startSession = useRealtimeSessionStore((state) => state.startSession);
  const endSession = useRealtimeSessionStore((state) => state.endSession);
  const setMicrophoneState = useRealtimeSessionStore(
    (state) => state.setMicrophoneState
  );
  const persistingHistory = useRealtimeSessionStore(
    (state) => state.persistingHistory
  );
  const historyError = useRealtimeSessionStore((state) => state.historyError);
  const lastError = useRealtimeSessionStore((state) => state.lastError);
  const historyId = useRealtimeSessionStore((state) => state.historyId);
  const historyTotalCount = useRealtimeSessionStore(
    (state) => state.historyTotalCount
  );
  const persistSessionHistory = useRealtimeSessionStore(
    (state) => state.persistSessionHistory
  );
  const hasStoredHistory = historyId !== null || historyTotalCount > 0;
  const summary = useRealtimeSessionStore((state) => state.summary);
  const summaryLoading = useRealtimeSessionStore(
    (state) => state.summaryLoading
  );
  const summaryError = useRealtimeSessionStore((state) => state.summaryError);
  const generateSummary = useRealtimeSessionStore(
    (state) => state.generateSummary
  );
  const exportPersistedHistory = useRealtimeSessionStore(
    (state) => state.exportPersistedHistory
  );
  const purgePersistedHistory = useRealtimeSessionStore(
    (state) => state.purgePersistedHistory
  );

  const [historyNotice, setHistoryNotice] = useState<{
    tone: "info" | "success" | "error";
    message: string;
  } | null>(null);
  const [exportingHistory, setExportingHistory] = useState(false);
  const [purgingHistory, setPurgingHistory] = useState(false);

  useEffect(() => {
    if (!historyError) {
      return;
    }

    setHistoryNotice({ tone: "error", message: historyError });
  }, [historyError]);

  const handlePersistHistory = useCallback(async () => {
    setHistoryNotice(null);
    try {
      await persistSessionHistory({
        finalize: true,
        endedAt: new Date().toISOString(),
      });
      setHistoryNotice({ tone: "success", message: "Session summary saved." });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save summary";
      setHistoryNotice({ tone: "error", message });
    }
  }, [persistSessionHistory]);

  const handleExportHistory = useCallback(async () => {
    setExportingHistory(true);
    setHistoryNotice(null);
    try {
      const record = await exportPersistedHistory();
      if (!record) {
        setHistoryNotice({
          tone: "info",
          message: "No saved history yet—start a session to capture one.",
        });
        return;
      }

      const blob = new Blob([JSON.stringify(record, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `realtime-session-${record.historyId}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setHistoryNotice({ tone: "success", message: "Summary exported." });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to export summary";
      setHistoryNotice({ tone: "error", message });
    } finally {
      setExportingHistory(false);
    }
  }, [exportPersistedHistory]);

  const handlePurgeHistory = useCallback(async () => {
    setPurgingHistory(true);
    setHistoryNotice(null);
    try {
      const deleted = await purgePersistedHistory();
      if (deleted.length === 0) {
        setHistoryNotice({
          tone: "info",
          message: "No stored summaries to purge.",
        });
      } else {
        setHistoryNotice({
          tone: "success",
          message:
            deleted.length === 1
              ? "Deleted 1 saved summary."
              : `Deleted ${deleted.length} saved summaries.`,
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to purge summaries";
      setHistoryNotice({ tone: "error", message });
    } finally {
      setPurgingHistory(false);
    }
  }, [purgePersistedHistory]);

  useEffect(() => {
    if (!autoStart || hasAttemptedStart) {
      return;
    }

    setHasAttemptedStart(true);

    startSession({ locale, voice }).catch(console.error);
  }, [autoStart, hasAttemptedStart, locale, voice, startSession]);

  return (
    <Card className={cn("flex h-full flex-col", className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="text-2xl font-semibold">
            Voice Companion
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {sessionMeta.sessionId
              ? "Session active"
              : "Start a session to begin"}
          </p>
        </div>
        <TransportHealthBadge
          connectionState={sessionMeta.connectionState}
          transport={sessionMeta.transport}
        />
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        {lastError && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{lastError}</span>
          </div>
        )}

        <div className="flex flex-col gap-4 rounded-lg border bg-card/60 p-4">
          <AudioVisualizer
            energy={audioEnergy}
            microphoneState={microphoneState}
            connectionState={sessionMeta.connectionState}
          />
          <SessionControls
            isInitializing={isInitializing}
            connectionState={sessionMeta.connectionState}
            microphoneState={microphoneState}
            onStart={() => startSession({ locale, voice })}
            onEnd={endSession}
            onToggleMicrophone={() =>
              setMicrophoneState(
                microphoneState === "muted" ? "unmuted" : "muted"
              )
            }
            onPushToTalk={(active: boolean) =>
              setMicrophoneState(active ? "held" : "muted")
            }
            pushToTalkActive={microphoneState === "held"}
          />
        </div>

        <div className="rounded-lg border bg-background/60 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" /> Session summary
              </p>
              <p className="text-xs text-muted-foreground">
                Generate a concise clinical note once the conversation feels
                complete.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Button
                size="sm"
                onClick={() => generateSummary()}
                disabled={summaryLoading || transcripts.length === 0}
              >
                {summaryLoading ? "Summarizing…" : "Generate summary"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handlePersistHistory}
                disabled={persistingHistory || !summary}
              >
                {persistingHistory
                  ? "Saving…"
                  : historyId
                  ? "Update saved summary"
                  : "Save summary"}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleExportHistory}
                disabled={exportingHistory || !hasStoredHistory}
              >
                {exportingHistory ? "Exporting…" : "Download JSON"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handlePurgeHistory}
                disabled={purgingHistory || !hasStoredHistory}
              >
                {purgingHistory ? "Purging…" : "Clear saved"}
              </Button>
            </div>
          </div>
          {summaryError && (
            <p className="mt-2 text-xs text-destructive">{summaryError}</p>
          )}
          {historyNotice && (
            <p
              className={cn(
                "mt-2 text-xs",
                historyNotice.tone === "error"
                  ? "text-rose-600"
                  : historyNotice.tone === "success"
                  ? "text-emerald-600"
                  : "text-muted-foreground"
              )}
            >
              {historyNotice.message}
            </p>
          )}
          <div className="mt-3 rounded-md border bg-muted/40 p-3 text-sm">
            {summary ? (
              <p className="whitespace-pre-wrap text-foreground">{summary}</p>
            ) : (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" /> No summary yet. Ask the
                companion for a recap or generate one with the button above.
              </p>
            )}
          </div>
          {hasStoredHistory && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Last saved summary {historyId ? `#${historyId}` : "available"}.{" "}
              {historyTotalCount} transcript turn
              {historyTotalCount === 1 ? "" : "s"} captured.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <button
            type="button"
            className="underline-offset-2 hover:underline"
            onClick={() => toggleCaptions()}
          >
            {captionsEnabled ? "Hide captions" : "Show captions"}
          </button>
          {isAgentTyping && <span>Companion is considering a reply…</span>}
        </div>

        <TranscriptList
          transcripts={transcripts}
          connectionState={sessionMeta.connectionState}
          captionsEnabled={captionsEnabled}
        />
      </CardContent>
    </Card>
  );
}
