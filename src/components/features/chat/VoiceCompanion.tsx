"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Waves } from "lucide-react";
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
  const sessionMeta = useRealtimeSessionStore((state) => ({
    sessionId: state.sessionId,
    connectionState: state.connectionState,
    transport: state.transport,
  }));
  const transcripts = useRealtimeSessionStore((state) => state.transcripts);
  const guardrails = useRealtimeSessionStore((state) => state.guardrails);
  const recommendedInterventions = useRealtimeSessionStore(
    (state) => state.recommendedInterventions
  );
  const audioEnergy = useRealtimeSessionStore((state) => state.audioEnergy);
  const backgroundNoiseLevel = useRealtimeSessionStore(
    (state) => state.backgroundNoiseLevel
  );
  const audioBuffers = useRealtimeSessionStore((state) => state.audioBuffers);
  const toolCalls = useRealtimeSessionStore((state) => state.toolCalls);
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
  const interruptionRequested = useRealtimeSessionStore(
    (state) => state.interruptionRequested
  );
  const requestInterruption = useRealtimeSessionStore(
    (state) => state.requestInterruption
  );
  const resolveInterruption = useRealtimeSessionStore(
    (state) => state.resolveInterruption
  );
  const moodInference = useRealtimeSessionStore((state) =>
    state.getCurrentMoodInference()
  );
  const prioritizedIntervention = useRealtimeSessionStore((state) =>
    state.getTopRecommendedIntervention()
  );
  const persistingHistory = useRealtimeSessionStore(
    (state) => state.persistingHistory
  );
  const historyError = useRealtimeSessionStore((state) => state.historyError);
  const historyId = useRealtimeSessionStore((state) => state.historyId);
  const historyTotalCount = useRealtimeSessionStore(
    (state) => state.historyTotalCount
  );
  const persistSessionHistory = useRealtimeSessionStore(
    (state) => state.persistSessionHistory
  );
  const exportPersistedHistory = useRealtimeSessionStore(
    (state) => state.exportPersistedHistory
  );
  const purgePersistedHistory = useRealtimeSessionStore(
    (state) => state.purgePersistedHistory
  );
  const hasStoredHistory = historyId !== null || historyTotalCount > 0;

  const guardrailIndicators = useMemo(() => {
    const indicators: { label: string; tone: "warning" | "destructive" }[] = [];
    const flags = guardrails;
    if (flags.crisisDetected) {
      indicators.push({ label: "Crisis detected", tone: "destructive" });
    }
    if (flags.escalationSuggested) {
      indicators.push({ label: "Escalation suggested", tone: "warning" });
    }
    if (flags.policyViolation) {
      indicators.push({ label: "Guardrail active", tone: "warning" });
    }
    return indicators;
  }, [guardrails]);

  const pendingToolCalls = useMemo(
    () => toolCalls.filter((item) => item.status === "pending"),
    [toolCalls]
  );

  const noisePercentage = useMemo(() => {
    const clamped = Math.max(0, Math.min(backgroundNoiseLevel, 1));
    return Math.round(clamped * 100);
  }, [backgroundNoiseLevel]);

  const latestAudioBuffer = useMemo(
    () =>
      audioBuffers.length > 0 ? audioBuffers[audioBuffers.length - 1] : null,
    [audioBuffers]
  );

  const latestAudioTimestamp = useMemo(() => {
    if (!latestAudioBuffer) return null;
    const parsed = new Date(latestAudioBuffer.timestamp);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [latestAudioBuffer]);

  const supportingTranscript = useMemo(() => {
    if (!moodInference) return null;
    return (
      transcripts.find(
        (item) => item.id === moodInference.supportingTranscriptId
      ) ?? null
    );
  }, [moodInference, transcripts]);

  const confidencePercent = useMemo(
    () => (moodInference ? Math.round(moodInference.confidence * 100) : null),
    [moodInference]
  );

  const sortedRecommendations = useMemo(() => {
    const priorityValue: Record<"high" | "medium" | "low", number> = {
      high: 0,
      medium: 1,
      low: 2,
    };

    return recommendedInterventions
      .slice()
      .sort((a, b) => priorityValue[a.priority] - priorityValue[b.priority]);
  }, [recommendedInterventions]);

  const handleInterruptionToggle = () => {
    if (interruptionRequested) {
      resolveInterruption();
    } else {
      requestInterruption();
    }
  };

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
      await persistSessionHistory({ finalize: false });
      setHistoryNotice({ tone: "success", message: "Snapshot saved." });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save snapshot";
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

      setHistoryNotice({ tone: "success", message: "History exported." });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to export history";
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
          message: "No stored history to purge.",
        });
      } else {
        setHistoryNotice({
          tone: "success",
          message:
            deleted.length === 1
              ? "Deleted 1 saved history."
              : `Deleted ${deleted.length} saved histories.`,
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to purge history";
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
            Realtime Companion
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

        {!!guardrailIndicators.length && (
          <div className="flex flex-wrap gap-2">
            {guardrailIndicators.map((indicator) => (
              <span
                key={indicator.label}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide",
                  indicator.tone === "warning"
                    ? "border-amber-300 bg-amber-200/30 text-amber-700"
                    : "border-rose-300 bg-rose-200/30 text-rose-700"
                )}
              >
                {indicator.label}
              </span>
            ))}
          </div>
        )}

        {sortedRecommendations.length > 0 && (
          <div className="rounded-lg border bg-background/60 p-3 text-sm">
            <p className="mb-2 font-semibold text-foreground">
              Suggested next steps
            </p>
            <ol className="space-y-2">
              {sortedRecommendations.map((item) => (
                <li key={item.type} className="rounded-md bg-muted/60 p-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{item.title}</p>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {item.priority}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.reasoning}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border bg-background/60 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <Activity className="h-3.5 w-3.5" /> Mood snapshot
              </span>
              {confidencePercent !== null && (
                <span className="text-xs font-semibold text-foreground">
                  {confidencePercent}% confident
                </span>
              )}
            </div>
            {moodInference ? (
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-lg font-semibold capitalize text-foreground">
                    {moodInference.sentiment}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Arousal {moodInference.arousal}
                  </p>
                </div>
                {moodInference.cues.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Detected cues</p>
                    <p>
                      {moodInference.cues.map((cue) => cue.term).join(", ")}
                    </p>
                  </div>
                )}
                {moodInference.patterns.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Patterns</p>
                    <ul className="list-disc pl-4">
                      {moodInference.patterns.map((pattern) => (
                        <li key={pattern.name}>{pattern.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {supportingTranscript && (
                  <blockquote className="rounded-md border-l-4 border-primary/40 bg-muted/40 p-3 text-xs italic text-muted-foreground">
                    “{supportingTranscript.content}”
                  </blockquote>
                )}
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                Share a few thoughts to let the companion gauge how you’re
                feeling.
              </p>
            )}

            {prioritizedIntervention && (
              <div className="mt-4 rounded-md border border-primary/30 bg-primary/10 p-3 text-xs text-primary-foreground">
                <p className="mb-1 font-semibold text-primary">
                  Highest priority suggestion
                </p>
                <p className="font-medium text-foreground">
                  {prioritizedIntervention.title}
                </p>
                <p className="text-muted-foreground">
                  {prioritizedIntervention.reasoning}
                </p>
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-background/60 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <Waves className="h-3.5 w-3.5" /> Channel telemetry
              </span>
              <span className="text-xs font-semibold text-foreground">
                Noise floor {noisePercentage}%
              </span>
            </div>

            <div className="mt-3 space-y-3">
              <div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${noisePercentage}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Lower values indicate clearer audio input. Consider moving to
                  a quieter space if the bar stays high.
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Recent audio buffers</span>
                <span className="font-semibold text-foreground">
                  {audioBuffers.length}
                </span>
              </div>

              {latestAudioTimestamp && latestAudioBuffer ? (
                <p className="text-xs text-muted-foreground">
                  Last{" "}
                  {latestAudioBuffer.direction === "incoming"
                    ? "assistant"
                    : "user"}{" "}
                  packet recorded at{" "}
                  {latestAudioTimestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Waiting for audio packets…
                </p>
              )}

              {pendingToolCalls.length > 0 ? (
                <div className="space-y-2">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-600">
                    <AlertTriangle className="h-3.5 w-3.5" /> Pending tool
                    approvals
                  </p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {pendingToolCalls.map((call) => (
                      <li
                        key={call.id}
                        className="rounded-md border border-amber-200/60 bg-amber-100/30 p-2"
                      >
                        <p className="font-medium text-foreground">
                          {call.name}
                        </p>
                        <p>Awaiting confirmation…</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No tool approvals pending.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-background/60 p-4 text-xs md:text-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Session history
              </p>
              <p className="text-xs text-muted-foreground">
                {historyId
                  ? `Last snapshot stored ${historyTotalCount} transcript${
                      historyTotalCount === 1 ? "" : "s"
                    }.`
                  : "Snapshots auto-save when the conversation has activity."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handlePersistHistory}
                disabled={persistingHistory || !sessionMeta.sessionId}
              >
                {persistingHistory ? "Saving…" : "Save snapshot"}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleExportHistory}
                disabled={exportingHistory || !hasStoredHistory}
              >
                {exportingHistory ? "Exporting…" : "Export JSON"}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handlePurgeHistory}
                disabled={purgingHistory || !hasStoredHistory}
              >
                {purgingHistory ? "Purging…" : "Clear history"}
              </Button>
            </div>
          </div>
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
          {persistingHistory && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Auto-saving recent turns…
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="underline-offset-2 hover:underline"
              onClick={() => toggleCaptions()}
            >
              {captionsEnabled ? "Hide captions" : "Show captions"}
            </button>
            <button
              type="button"
              className={cn(
                "underline-offset-2 hover:underline",
                interruptionRequested && "text-amber-600"
              )}
              onClick={handleInterruptionToggle}
            >
              {interruptionRequested
                ? "Cancel interruption request"
                : "Request companion pause"}
            </button>
          </div>
          <div className="flex items-center gap-2">
            {interruptionRequested && (
              <span className="text-amber-600">Pause requested…</span>
            )}
            {isAgentTyping && <span>Companion is formulating a response…</span>}
          </div>
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
