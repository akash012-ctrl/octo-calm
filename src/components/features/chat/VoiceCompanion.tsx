"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Waves } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRealtimeSessionStore } from "@/lib/stores/realtimeSessionStore";
import { SessionControls } from "./SessionControls";
import { TranscriptList } from "./TranscriptList";
import { AudioVisualizer } from "./AudioVisualizer";
import { TransportHealthBadge } from "./TransportHealthBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  const handleInterruptionToggle = () => {
    if (interruptionRequested) {
      resolveInterruption();
    } else {
      requestInterruption();
    }
  };

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

        {recommendedInterventions.length > 0 && (
          <div className="rounded-lg border bg-background/60 p-3 text-sm">
            <p className="mb-2 font-semibold text-foreground">
              Suggested next steps
            </p>
            <ol className="space-y-2">
              {recommendedInterventions
                .slice()
                .sort((a, b) => a.priority - b.priority)
                .map((item) => (
                  <li key={item.id} className="rounded-md bg-muted/60 p-2">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.reason}
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
                    <p>{moodInference.cues.join(", ")}</p>
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
                  {prioritizedIntervention.reason}
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
