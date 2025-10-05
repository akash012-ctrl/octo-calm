"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { HeartPulse, Sparkles, Wind } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MoodCheckIn } from "@/types/mood";
import { InterventionCard } from "./InterventionCard";
import { InterventionModal } from "./InterventionModal";
import { GroundingExercise } from "./GroundingExercise";
import { BreathingExercise } from "./BreathingExercise";
import { InterventionFeedback } from "./InterventionFeedback";
import {
  completeInterventionSession,
  startInterventionSession,
} from "@/lib/interventions/client";
import { useRealtimeSessionStore } from "@/lib/stores/realtimeSessionStore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const INTERVENTION_MAP = {
  grounding: "grounding_60s",
  breathing: "box_breathing_90s",
} as const;

type InterventionApiType = keyof typeof INTERVENTION_MAP;

type InterventionOption = {
  id: "grounding_60s" | "box_breathing_90s";
  title: string;
  description: string;
  durationMinutes: number;
  voicePersona: string;
  icon: ReactNode;
  previewCopy: string;
  rationale: string;
};

const INTERVENTION_OPTIONS: InterventionOption[] = [
  {
    id: "grounding_60s",
    title: "Grounding",
    description: "Ease Youself",
    durationMinutes: 1,
    voicePersona: "Calm",
    icon: <Sparkles className="h-5 w-5" />,
    previewCopy:
      "Companion guides a 5-4-3-2-1 scan and mirrors your senses back.",
    rationale: "Best for anxious loops or when you need safety cues.",
  },
  {
    id: "box_breathing_90s",
    title: "Box Breathing",
    description: "Guided breathing",
    durationMinutes: 2,
    voicePersona: "rhythmic pacing",
    icon: <Wind className="h-5 w-5" />,
    previewCopy:
      "Counted inhales, holds, and exhales with optional rain or ocean.",
    rationale: "Use when energy spikes or focus feels scattered.",
  },
];

type NoticeState = {
  tone: "info" | "success" | "error";
  message: string;
} | null;

type ActiveSessionState = {
  option: InterventionOption;
  interventionSessionId: string;
  startedAt: string;
  agentInstructions?: string;
  realtimeSessionId: string | null;
};

type InterventionHubProps = {
  recentCheckIns: MoodCheckIn[];
  className?: string;
};

type FeedbackPayload = {
  rating: number;
  calmnessDelta: number | null;
  feedback: string;
};

type PendingMetrics = {
  durationMs: number;
};

export function InterventionHub({
  recentCheckIns,
  className,
}: InterventionHubProps) {
  const [notice, setNotice] = useState<NoticeState>(null);
  const [activeSession, setActiveSession] = useState<ActiveSessionState | null>(
    null
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStage, setModalStage] = useState<"exercise" | "feedback">(
    "exercise"
  );
  const [modalError, setModalError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingMetrics, setPendingMetrics] = useState<PendingMetrics | null>(
    null
  );
  const startTimestampRef = useRef<number | null>(null);

  const realtimeSessionId = useRealtimeSessionStore((state) => state.sessionId);
  const recommendedInterventions = useRealtimeSessionStore(
    (state) => state.recommendedInterventions
  );
  const getCurrentMoodInference = useRealtimeSessionStore(
    (state) => state.getCurrentMoodInference
  );

  const baselineMood = useMemo(
    () => recentCheckIns?.[0]?.mood ?? undefined,
    [recentCheckIns]
  );

  const recommendedOptionId = useMemo(() => {
    if (!recommendedInterventions.length) return null;
    const prioritized = recommendedInterventions[0];
    const mapped = INTERVENTION_MAP[prioritized.type as InterventionApiType] as
      | string
      | undefined;
    return mapped ?? null;
  }, [recommendedInterventions]);

  const resetState = () => {
    setModalOpen(false);
    setModalStage("exercise");
    setModalError(null);
    setPendingMetrics(null);
    setActiveSession(null);
    startTimestampRef.current = null;
  };

  const handlePreviewVoice = (option: InterventionOption) => {
    setNotice({ tone: "info", message: option.previewCopy });
  };

  const handleStart = async (option: InterventionOption) => {
    setNotice(null);
    setModalError(null);
    setLoadingId(option.id);

    try {
      const response = await startInterventionSession({
        interventionType: option.id,
        realtimeSessionId,
      });

      setActiveSession({
        option,
        interventionSessionId: response.interventionSessionId,
        startedAt: response.startedAt,
        agentInstructions: response.agentInstructions,
        realtimeSessionId: response.realtimeSessionId,
      });
      setModalStage("exercise");
      setModalOpen(true);
      startTimestampRef.current =
        typeof performance !== "undefined" ? performance.now() : Date.now();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to start intervention";
      setNotice({ tone: "error", message });
    } finally {
      setLoadingId(null);
    }
  };

  const submitCompletion = async (
    payload: Omit<FeedbackPayload, "rating"> & {
      rating?: number | null;
      durationMs?: number;
    }
  ) => {
    if (!activeSession) return;
    setSubmitting(true);
    setModalError(null);

    try {
      const durationSeconds = Math.max(
        0,
        Math.round(
          (payload.durationMs ?? pendingMetrics?.durationMs ?? 0) / 1000
        )
      );

      const inference = getCurrentMoodInference?.();

      await completeInterventionSession({
        interventionSessionId: activeSession.interventionSessionId,
        durationSeconds,
        helpfulnessRating: payload.rating ?? null,
        calmnessDelta:
          typeof payload.calmnessDelta === "number"
            ? payload.calmnessDelta
            : null,
        feedback: payload.feedback,
        realtimeSessionId:
          activeSession.realtimeSessionId ?? realtimeSessionId ?? undefined,
        moodInference: inference
          ? {
              sentiment: inference.sentiment,
              arousal: inference.arousal,
              recommendedAction: inference.recommendedAction,
            }
          : undefined,
      });

      setNotice({
        tone: "success",
        message: `${activeSession.option.title} session saved to your history.`,
      });
      resetState();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save intervention";
      setModalError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGroundingComplete = async ({
    rating,
    calmnessDelta,
    feedback,
    durationMs,
  }: FeedbackPayload & { durationMs: number }) => {
    await submitCompletion({
      rating,
      calmnessDelta,
      feedback,
      durationMs,
    });
  };

  const handleBreathingComplete = () => {
    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const durationMs = startTimestampRef.current
      ? now - startTimestampRef.current
      : 0;
    setPendingMetrics({ durationMs });
    setModalStage("feedback");
  };

  const handleBreathingFeedbackSubmit = async ({
    rating,
    calmnessDelta,
    feedback,
  }: FeedbackPayload) => {
    await submitCompletion({
      rating,
      calmnessDelta,
      feedback,
    });
  };

  const handleModalClose = () => {
    resetState();
  };

  const handleCancelIntervention = () => {
    setNotice({
      tone: "info",
      message: "Paused—jump back in whenever you're ready.",
    });
    resetState();
  };

  return (
    <div className={cn("w-full", className)}>
      <Card className="octo-card shadow-primary-glow">
        <CardHeader className="flex flex-col gap-2">
          <CardTitle className="flex items-center gap-2 text-2xl font-semibold">
            <HeartPulse className="h-5 w-5 text-primary" /> Guided Interventions
          </CardTitle>
          <CardDescription>
            Start a quick reset now or follow the companion’s latest pick.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {notice && (
            <div
              className={cn(
                "rounded-md border p-3 text-sm",
                notice.tone === "success"
                  ? "border-emerald-300 bg-emerald-100/50 text-emerald-800"
                  : notice.tone === "error"
                  ? "border-rose-300 bg-rose-100/60 text-rose-800"
                  : "border-blue-300 bg-blue-100/60 text-blue-800"
              )}
            >
              {notice.message}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 p-4">
            {INTERVENTION_OPTIONS.map((option) => {
              const isRecommended = recommendedOptionId === option.id;
              const isLoading = loadingId === option.id;

              return (
                <div
                  key={option.id}
                  className={cn(
                    "relative",
                    isRecommended &&
                      'after:absolute after:right-3 after:top-3 after:text-[10px] after:font-semibold after:uppercase after:tracking-wide after:text-primary after:content-["Recommended"]'
                  )}
                > 
                  <InterventionCard
                    id={option.id}
                    title={option.title}
                    description={option.description}
                    durationMinutes={option.durationMinutes}
                    icon={option.icon}
                    voicePersona={option.voicePersona}
                    active={activeSession?.option.id === option.id && modalOpen}
                    disabled={Boolean(loadingId) && !isLoading}
                    onStart={() => handleStart(option)}
                    onPreviewVoice={() => handlePreviewVoice(option)}
                    className={cn(
                      isRecommended && "border-primary/50 shadow-md",
                      isLoading && "opacity-70"
                    )}
                  />
                  
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <InterventionModal
        open={modalOpen && Boolean(activeSession)}
        onClose={handleModalClose}
        title={activeSession?.option.title ?? "Intervention"}
        subtitle={activeSession?.agentInstructions}
        currentStep={modalStage === "feedback" ? 2 : 1}
        totalSteps={activeSession?.option.id === "box_breathing_90s" ? 2 : 1}
        statusLabel={
          activeSession?.option.id === "box_breathing_90s"
            ? modalStage === "feedback"
              ? "Share feedback"
              : "Guided rhythm"
            : "Guided session"
        }
        footer={null}
      >
        {modalError && (
          <div className="mb-4 rounded-md border border-rose-300 bg-rose-100/60 p-3 text-sm text-rose-800">
            {modalError}
          </div>
        )}

        {activeSession && modalStage === "exercise" && (
          <div className="space-y-4">
            {activeSession.agentInstructions && (
              <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
                <p className="font-medium text-primary">Companion guidance</p>
                <p>{activeSession.agentInstructions}</p>
              </div>
            )}

            {activeSession.option.id === "grounding_60s" ? (
              <GroundingExercise
                onComplete={handleGroundingComplete}
                baselineMood={baselineMood}
                currentMood={undefined}
                onSkip={handleCancelIntervention}
              />
            ) : (
              <BreathingExercise
                key={activeSession.interventionSessionId}
                onComplete={handleBreathingComplete}
                onCancel={handleCancelIntervention}
              />
            )}
          </div>
        )}

        {activeSession && modalStage === "feedback" && (
          <div className="space-y-4">
            <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
              <p className="font-medium text-primary">
                How was the breathing exercise?
              </p>
              <p>
                Share a quick rating so the companion can tailor breathing pace
                and follow-up support.
              </p>
            </div>
            <InterventionFeedback
              baselineMood={baselineMood}
              currentMood={undefined}
              submitting={submitting}
              onSubmit={handleBreathingFeedbackSubmit}
            />
          </div>
        )}
      </InterventionModal>
    </div>
  );
}
