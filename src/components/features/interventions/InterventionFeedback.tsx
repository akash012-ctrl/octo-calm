"use client";

import { useMemo, useState } from "react";
import { Star, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface InterventionFeedbackProps {
  baselineMood?: number;
  currentMood?: number;
  onSubmit?: (payload: {
    rating: number;
    calmnessDelta: number | null;
    feedback: string;
  }) => void;
  submitting?: boolean;
}

export function InterventionFeedback({
  baselineMood,
  currentMood,
  onSubmit,
  submitting = false,
}: InterventionFeedbackProps) {
  const [rating, setRating] = useState(4);
  const [feedback, setFeedback] = useState("");
  const [capturingVoice, setCapturingVoice] = useState(false);

  const calmnessDelta = useMemo(() => {
    if (baselineMood === undefined || currentMood === undefined) {
      return null;
    }
    return currentMood - baselineMood;
  }, [baselineMood, currentMood]);

  return (
    <Card className="border-primary/20">
      <CardHeader className="border-b bg-primary/5">
        <CardTitle className="text-lg font-semibold">
          How helpful was this?
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Your feedback trains the companion to tailor future interventions.
          Voice notes are converted to private transcripts.
        </p>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Helpfulness rating
          </p>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                className="transition hover:scale-105"
                onClick={() => setRating(value)}
                aria-label={`Set rating to ${value}`}
              >
                <Star
                  className={cn(
                    "h-6 w-6",
                    value <= rating
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground"
                  )}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Calmness check-in
          </label>
          {calmnessDelta !== null ? (
            <p>
              You shifted {Math.abs(calmnessDelta)} points toward{" "}
              {calmnessDelta >= 0 ? "calmer" : "higher arousal"}.
            </p>
          ) : (
            <p>
              We’ll compare your mood before and after sessions to track
              improvements.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Add a reflection
          </label>
          <textarea
            className="h-24 w-full resize-none rounded-md border border-input bg-background p-3 text-sm text-foreground shadow-sm outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
            placeholder="Share what shifted for you, or note anything that didn’t resonate."
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
          />
          <button
            type="button"
            className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => setCapturingVoice((prev) => !prev)}
          >
            <Mic className="h-3.5 w-3.5" />{" "}
            {capturingVoice ? "Stop voice capture" : "Add voice note"}
          </button>
          {capturingVoice && (
            <p className="text-xs text-primary">
              Listening… We’ll transcribe your note and attach it securely to
              this session.
            </p>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-end gap-3 border-t bg-muted/10 p-4">
        <Button
          type="button"
          onClick={() => onSubmit?.({ rating, calmnessDelta, feedback })}
          disabled={submitting}
        >
          {submitting ? "Saving…" : "Save feedback"}
        </Button>
      </CardFooter>
    </Card>
  );
}
