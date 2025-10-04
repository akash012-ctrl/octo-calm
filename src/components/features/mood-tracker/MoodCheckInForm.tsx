"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mic, MicOff, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MoodSlider } from "./MoodSlider";
import {
  moodCheckInSchema,
  type MoodCheckInFormData,
} from "@/lib/validation/mood-schemas";
import { COMMON_TRIGGERS, GROUNDING_PROMPTS } from "@/types/mood";
import { cn } from "@/lib/utils";

interface MoodCheckInFormProps {
  onSubmit: (data: MoodCheckInFormData) => Promise<void>;
  defaultValues?: Partial<MoodCheckInFormData>;
  className?: string;
}

export function MoodCheckInForm({
  onSubmit,
  defaultValues,
  className,
}: MoodCheckInFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitStatus, setSubmitStatus] = React.useState<
    "idle" | "success" | "error"
  >("idle");
  const [isRecording, setIsRecording] = React.useState(false);
  const [selectedTriggers, setSelectedTriggers] = React.useState<string[]>(
    defaultValues?.triggers || []
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(moodCheckInSchema),
    defaultValues: {
      mood: 3,
      intensity: 5,
      triggers: [],
      notes: "",
      ...defaultValues,
    },
  });

  const mood = watch("mood");
  const intensity = watch("intensity");

  const handleFormSubmit = async (data: MoodCheckInFormData) => {
    try {
      setIsSubmitting(true);
      setSubmitStatus("idle");
      await onSubmit({ ...data, triggers: selectedTriggers });
      setSubmitStatus("success");

      // Play success audio chime (optional)
      if (typeof Audio !== "undefined") {
        const successSound = new Audio("/sounds/success.mp3");
        successSound.play().catch(() => {
          // Silent fail if audio not available
        });
      }

      // Reset form after success
      setTimeout(() => {
        reset();
        setSelectedTriggers([]);
        setSubmitStatus("idle");
      }, 2000);
    } catch (error) {
      console.error("Failed to submit check-in:", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTrigger = (trigger: string) => {
    setSelectedTriggers((prev) =>
      prev.includes(trigger)
        ? prev.filter((t) => t !== trigger)
        : [...prev, trigger]
    );
  };

  const toggleRecording = () => {
    setIsRecording((prev) => !prev);
    // TODO: Implement actual voice recording in Phase 2.2
    // This will integrate with the Realtime API
  };

  const randomGroundingPrompt = React.useMemo(() => {
    return GROUNDING_PROMPTS[
      Math.floor(Math.random() * GROUNDING_PROMPTS.length)
    ];
  }, []);

  return (
    <Card className={cn("w-full max-w-2xl", className)}>
      <CardHeader>
        <CardTitle>Daily Mood Check-In</CardTitle>
        <CardDescription>
          Take a moment to reflect on how you&apos;re feeling right now.
        </CardDescription>
        {mood <= 2 && (
          <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              💙 {randomGroundingPrompt}
            </p>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Mood Slider */}
          <div>
            <Label
              htmlFor="mood"
              className="text-base font-semibold mb-4 block"
            >
              How are you feeling?
            </Label>
            <MoodSlider
              value={mood}
              onChange={(value) => setValue("mood", value)}
              disabled={isSubmitting}
            />
            {errors.mood && (
              <p className="text-sm text-red-500 mt-2">{errors.mood.message}</p>
            )}
          </div>

          {/* Intensity Slider */}
          <div>
            <Label
              htmlFor="intensity"
              className="text-base font-semibold mb-2 block"
            >
              Intensity Level: {intensity}/10
            </Label>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Low</span>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={intensity}
                onChange={(e) =>
                  setValue("intensity", parseInt(e.target.value))
                }
                disabled={isSubmitting}
                className="flex-1 h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="text-sm text-muted-foreground">High</span>
            </div>
            {errors.intensity && (
              <p className="text-sm text-red-500 mt-2">
                {errors.intensity.message}
              </p>
            )}
          </div>

          {/* Triggers Multi-Select */}
          <div>
            <Label className="text-base font-semibold mb-3 block">
              What triggered these feelings? (Optional)
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {COMMON_TRIGGERS.map((trigger) => (
                <button
                  key={trigger}
                  type="button"
                  onClick={() => toggleTrigger(trigger)}
                  disabled={isSubmitting}
                  className={cn(
                    "px-3 py-2 text-sm rounded-lg border transition-all",
                    "hover:border-primary hover:bg-primary/5",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    selectedTriggers.includes(trigger)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-input"
                  )}
                >
                  {trigger}
                </button>
              ))}
            </div>
          </div>

          {/* Notes with Voice Toggle */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="notes" className="text-base font-semibold">
                Additional Notes (Optional)
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleRecording}
                disabled={isSubmitting}
                className={cn(
                  "gap-2",
                  isRecording &&
                    "bg-red-50 border-red-300 text-red-600 dark:bg-red-950 dark:border-red-800"
                )}
              >
                {isRecording ? (
                  <>
                    <MicOff className="h-4 w-4" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4" />
                    Voice Dictation
                  </>
                )}
              </Button>
            </div>
            <Input
              id="notes"
              {...register("notes")}
              placeholder="Any additional thoughts or context..."
              disabled={isSubmitting || isRecording}
              className="min-h-[100px] resize-y"
              aria-label="Additional notes"
            />
            {isRecording && (
              <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Recording... (Voice feature coming in Phase 2.2)
              </p>
            )}
            {errors.notes && (
              <p className="text-sm text-red-500 mt-2">
                {errors.notes.message}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex flex-col gap-3 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Saving Check-In...
                </>
              ) : submitStatus === "success" ? (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  Check-In Saved!
                </>
              ) : (
                "Complete Check-In"
              )}
            </Button>

            {submitStatus === "error" && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <p className="text-sm text-red-800 dark:text-red-200">
                  Failed to save check-in. Please try again.
                </p>
              </div>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
