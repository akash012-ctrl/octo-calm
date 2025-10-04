"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InterventionTimer, InterventionTimerPhase } from "./InterventionTimer";
import { cn } from "@/lib/utils";

interface BreathingExerciseProps {
  cycles?: number;
  onComplete?: () => void;
  onCancel?: () => void;
  className?: string;
}

const BOX_PHASES: InterventionTimerPhase[] = [
  { label: "Inhale", duration: 4, prompt: "Breathe in slowly for four counts" },
  { label: "Hold", duration: 4, prompt: "Gently hold the breath" },
  { label: "Exhale", duration: 4, prompt: "Release the air softly" },
  { label: "Hold", duration: 4, prompt: "Rest before the next cycle" },
];

export function BreathingExercise({
  cycles = 6,
  onComplete,
  onCancel,
  className,
}: BreathingExerciseProps) {
  const [showTips, setShowTips] = useState(false);

  const totalDuration = useMemo(
    () => BOX_PHASES.reduce((sum, phase) => sum + phase.duration, 0) * cycles,
    [cycles]
  );

  return (
    <Card className={cn("h-full border-primary/20", className)}>
      <CardHeader className="border-b bg-primary/5">
        <CardTitle className="text-xl font-semibold">
          Box Breathing 90s
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Follow the 4-4-4-4 rhythm with synchronized audio cues. Each
          four-count guides the inhale, hold, exhale, and rest.
        </p>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
          <p>
            This routine repeats for {cycles} cycles (~
            {Math.round(totalDuration / 60)} min). Adjust your posture, relax
            your shoulders, and let your companion keep time.
          </p>
        </div>

        <InterventionTimer
          phases={BOX_PHASES}
          cycles={cycles}
          onComplete={onComplete}
        />

        <div className="space-y-3 text-xs text-muted-foreground">
          <button
            type="button"
            className="flex items-center gap-2 underline-offset-2 hover:underline"
            onClick={() => setShowTips((prev) => !prev)}
          >
            <AlertCircle className="h-3.5 w-3.5" />{" "}
            {showTips ? "Hide pacing tips" : "Show pacing tips"}
          </button>
          {showTips && (
            <ul className="space-y-2">
              <li>
                • Breathe through the nose during inhales and exhales when
                comfortable.
              </li>
              <li>
                • Keep shoulders relaxed; focus movement in the diaphragm.
              </li>
              <li>
                • If dizziness occurs, pause and return to natural breathing.
              </li>
            </ul>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/10 p-4">
        {onCancel ? (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        ) : (
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />{" "}
            Auto-completes when cycles finish
          </span>
        )}
        <Button variant="outline" size="sm" onClick={() => setShowTips(true)}>
          Need guidance?
        </Button>
      </CardFooter>
    </Card>
  );
}
