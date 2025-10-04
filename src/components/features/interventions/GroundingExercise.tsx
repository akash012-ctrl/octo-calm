"use client";

import { useMemo, useRef, useState } from "react";
import { CheckCircle2, Mic, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { InterventionFeedback } from "./InterventionFeedback";

type GroundingAction = "capture" | "skip" | "advance";

export interface GroundingCompletionMetrics {
  durationMs: number;
  reflections: string[];
  rating: number;
  calmnessDelta: number | null;
  feedback: string;
}

interface GroundingExerciseProps {
  onComplete?: (metrics: GroundingCompletionMetrics) => void;
  onSkip?: () => void;
  onCaptureReflection?: (content: string) => void;
  onStepChange?: (payload: {
    index: number;
    label: string;
    action: GroundingAction;
  }) => void;
  baselineMood?: number;
  currentMood?: number;
  className?: string;
}

const STEPS = [
  {
    label: "Sight",
    instruction: "Name five things you can see around you.",
    count: 5,
  },
  {
    label: "Touch",
    instruction: "Notice four things you can touch and describe how they feel.",
    count: 4,
  },
  {
    label: "Hearing",
    instruction: "Listen for three sounds you can hear right now.",
    count: 3,
  },
  {
    label: "Smell",
    instruction: "Identify two things you can smell, even faintly.",
    count: 2,
  },
  {
    label: "Taste",
    instruction:
      "Note one thing you can taste or the lingering flavor you notice.",
    count: 1,
  },
] as const;

function useGroundingSession(
  onStepChange?: GroundingExerciseProps["onStepChange"],
  onCapture?: (content: string) => void
) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reflections, setReflections] = useState<string[]>([]);

  const currentStep = useMemo(
    () => STEPS[currentIndex] ?? null,
    [currentIndex]
  );
  const isFinished = currentIndex >= STEPS.length;

  const advance = (action: GroundingAction = "advance") => {
    if (currentStep) {
      onStepChange?.({ index: currentIndex, label: currentStep.label, action });
    }
    if (currentIndex + 1 >= STEPS.length) {
      setCurrentIndex(STEPS.length);
      return true;
    }
    setCurrentIndex((prev) => prev + 1);
    return false;
  };

  const skip = () => advance("skip");

  const capture = (content: string) => {
    setReflections((prev) => [...prev, content]);
    onCapture?.(content);
    return advance("capture");
  };

  const restart = () => {
    setCurrentIndex(0);
    setReflections([]);
  };

  return {
    currentIndex,
    currentStep,
    reflections,
    isFinished,
    advance,
    skip,
    capture,
    restart,
  };
}

export function GroundingExercise({
  onComplete,
  onSkip,
  onCaptureReflection,
  onStepChange,
  baselineMood,
  currentMood,
  className,
}: GroundingExerciseProps) {
  const {
    currentIndex,
    currentStep,
    reflections,
    isFinished,
    advance,
    skip,
    capture,
    restart,
  } = useGroundingSession(onStepChange, onCaptureReflection);

  const [collectFeedback, setCollectFeedback] = useState(false);
  const startTimeRef = useRef<number>(
    typeof performance !== "undefined" ? performance.now() : Date.now()
  );

  const handleAdvance = () => {
    if (advance()) {
      setCollectFeedback(true);
    }
  };

  const handleCapture = () => {
    if (!currentStep) return;
    if (
      capture(
        `Captured ${
          currentStep.count
        } ${currentStep.label.toLowerCase()} observations`
      )
    ) {
      setCollectFeedback(true);
    }
  };

  const handleSkip = () => {
    if (skip()) {
      setCollectFeedback(true);
    }
    onSkip?.();
  };

  const handleFeedbackSubmit = ({
    rating,
    calmnessDelta,
    feedback,
  }: {
    rating: number;
    calmnessDelta: number | null;
    feedback: string;
  }) => {
    const endedAt =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const durationMs = endedAt - startTimeRef.current;
    onComplete?.({ durationMs, reflections, rating, calmnessDelta, feedback });
    setCollectFeedback(false);
  };

  const handleRestart = () => {
    startTimeRef.current =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    setCollectFeedback(false);
    restart();
  };

  return (
    <Card className={cn("h-full border-primary/20", className)}>
      <CardHeader className="border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <CardTitle className="text-xl font-semibold">Grounding 60s</CardTitle>
        <p className="text-sm text-muted-foreground">
          Gently reconnect with the present moment using the 5-4-3-2-1 technique
          guided by your companion.
        </p>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
          <span>
            Step {Math.min(currentIndex + 1, STEPS.length)} of {STEPS.length}
          </span>
          {isFinished && (
            <span className="flex items-center gap-1 text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" /> Completed
            </span>
          )}
        </div>

        {!isFinished && currentStep && (
          <div className="space-y-4">
            <div className="rounded-xl border bg-muted/40 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {currentStep.label}
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {currentStep.instruction}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Share {currentStep.count} observations using your voice or the
                text box. Your companion mirrors them back to reinforce
                grounding.
              </p>
            </div>

            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <button
                type="button"
                className="flex items-center gap-2 rounded-md border border-dashed border-primary/40 bg-primary/5 p-3 text-left transition hover:border-primary hover:bg-primary/10"
                onClick={handleCapture}
              >
                <Mic className="h-4 w-4" /> Tap to dictate your observations
              </button>
              <button
                type="button"
                className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground underline-offset-2 hover:underline"
                onClick={handleSkip}
              >
                Skip this sense
              </button>
            </div>
          </div>
        )}

        {isFinished && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-emerald-500/10 p-4">
              <p className="text-sm font-semibold text-emerald-700">
                Great work staying present.
              </p>
              <p className="text-xs text-emerald-900">
                Take a calming breath and notice the shift in your body. You can
                share a reflection or begin a new intervention.
              </p>
            </div>
            {reflections.length > 0 && (
              <div className="space-y-2 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">
                  Your captured observations
                </p>
                <ul className="space-y-1">
                  {reflections.map((entry, index) => (
                    <li
                      key={`${entry}-${index}`}
                      className="rounded-md border bg-muted/40 p-2"
                    >
                      {entry}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {collectFeedback && (
          <InterventionFeedback
            baselineMood={baselineMood}
            currentMood={currentMood}
            onSubmit={handleFeedbackSubmit}
          />
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/10 p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {onSkip && (
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              <SkipForward className="mr-1 h-3.5 w-3.5" /> Skip
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleRestart}
          >
            Restart
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleAdvance}
            className="uppercase tracking-wide"
          >
            {isFinished ? "Review" : "Next sense"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
