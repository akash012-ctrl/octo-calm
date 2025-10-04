"use client";

import { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface InterventionCardProps {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  icon?: ReactNode;
  voicePersona?: string;
  active?: boolean;
  disabled?: boolean;
  onStart?: (id: string) => void;
  onPreviewVoice?: (id: string) => void;
  className?: string;
}

export function InterventionCard({
  id,
  title,
  description,
  durationMinutes,
  icon,
  voicePersona,
  active = false,
  disabled = false,
  onStart,
  onPreviewVoice,
  className,
}: InterventionCardProps) {
  return (
    <Card
      className={cn(
        "flex h-full flex-col border-primary/20 transition hover:border-primary/40",
        active && "border-primary shadow-lg",
        disabled && "pointer-events-none opacity-60",
        className
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-2">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            {icon && <span className="text-primary">{icon}</span>}
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="flex flex-col items-end text-xs uppercase tracking-wide text-muted-foreground">
          <span>{durationMinutes} min</span>
          {voicePersona && (
            <span className="font-semibold text-foreground">
              {voicePersona}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 text-sm text-muted-foreground">
        <p>
          Guided voice support to help you reset in moments of heightened
          stress. Audio is synced with captions and gentle animation cues.
        </p>
      </CardContent>
      <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="default"
          onClick={() => onStart?.(id)}
          disabled={disabled}
          className="w-full sm:w-auto"
        >
          Begin now
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => onPreviewVoice?.(id)}
          disabled={disabled}
          className="w-full sm:w-auto"
        >
          Preview voice
        </Button>
      </CardFooter>
    </Card>
  );
}
