"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

const MOOD_LEVELS = [
  { value: 1, emoji: "😢", label: "Very Low", color: "bg-red-500" },
  { value: 2, emoji: "😔", label: "Low", color: "bg-orange-500" },
  { value: 3, emoji: "😐", label: "Neutral", color: "bg-yellow-500" },
  { value: 4, emoji: "🙂", label: "Good", color: "bg-green-500" },
  { value: 5, emoji: "😊", label: "Great", color: "bg-blue-500" },
];

interface MoodSliderProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
}

export function MoodSlider({
  value,
  onChange,
  className,
  disabled = false,
}: MoodSliderProps) {
  const currentMood =
    MOOD_LEVELS.find((m) => m.value === value) || MOOD_LEVELS[2];

  return (
    <div className={cn("space-y-6", className)}>
      {/* Current Mood Display */}
      <div className="text-center space-y-2">
        <div className="text-6xl animate-in fade-in zoom-in duration-300">
          {currentMood.emoji}
        </div>
        <div className="text-lg font-medium text-foreground">
          {currentMood.label}
        </div>
      </div>

      {/* Slider */}
      <div className="space-y-4">
        <SliderPrimitive.Root
          className="relative flex w-full touch-none select-none items-center"
          value={[value]}
          onValueChange={(values) => onChange(values[0])}
          max={5}
          min={1}
          step={1}
          disabled={disabled}
          aria-label="Mood level"
        >
          <SliderPrimitive.Track className="relative h-3 w-full grow overflow-hidden rounded-full bg-secondary">
            <SliderPrimitive.Range
              className={cn(
                "absolute h-full transition-colors",
                currentMood.color
              )}
            />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb
            className={cn(
              "block h-6 w-6 rounded-full border-2 border-primary bg-background ring-offset-background transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:pointer-events-none disabled:opacity-50",
              "hover:scale-110 active:scale-95"
            )}
          />
        </SliderPrimitive.Root>

        {/* Mood Labels */}
        <div className="flex justify-between text-xs text-muted-foreground px-1">
          {MOOD_LEVELS.map((mood) => (
            <button
              key={mood.value}
              onClick={() => !disabled && onChange(mood.value)}
              className={cn(
                "flex flex-col items-center gap-1 transition-all hover:scale-110",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md p-1",
                value === mood.value && "scale-110 text-foreground font-medium"
              )}
              disabled={disabled}
              aria-label={`Set mood to ${mood.label}`}
            >
              <span className="text-xl">{mood.emoji}</span>
              <span className="hidden sm:inline">{mood.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
