"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ProgressBar } from "./ProgressBar";

export interface InterventionTimerPhase {
  label: string;
  duration: number; // seconds
  prompt?: string;
}

interface InterventionTimerProps {
  phases: InterventionTimerPhase[];
  cycles?: number;
  autoStart?: boolean;
  onPhaseChange?: (phaseIndex: number, cycle: number) => void;
  onComplete?: () => void;
  className?: string;
}

interface TimerSnapshot {
  normalizedPhases: InterventionTimerPhase[];
  totalDuration: number;
  elapsed: number;
  cycleIndex: number;
  phaseIndex: number;
  isRunning: boolean;
  toggleRunning: () => void;
  currentPhase: InterventionTimerPhase | undefined;
  phaseRemaining: number;
}

function useTimerSnapshot({
  phases,
  cycles,
  autoStart,
  onPhaseChange,
  onComplete,
}: {
  phases: InterventionTimerPhase[];
  cycles: number;
  autoStart: boolean;
  onPhaseChange?: (phaseIndex: number, cycle: number) => void;
  onComplete?: () => void;
}): TimerSnapshot {
  const normalizedPhases = useMemo(
    () => phases.filter((phase) => phase.duration > 0),
    [phases]
  );
  const totalDuration = useMemo(
    () =>
      normalizedPhases.reduce((sum, phase) => sum + phase.duration, 0) *
      Math.max(cycles, 1),
    [normalizedPhases, cycles]
  );

  const [isRunning, setIsRunning] = useState(autoStart);
  const [elapsed, setElapsed] = useState(0);
  const [cycleIndex, setCycleIndex] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isRunning || normalizedPhases.length === 0) {
      return;
    }

    intervalRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, normalizedPhases.length]);

  useEffect(() => {
    if (normalizedPhases.length === 0) {
      return;
    }

    const totalPerCycle =
      normalizedPhases.reduce((sum, phase) => sum + phase.duration, 0) || 1;
    const elapsedInCycle = elapsed % totalPerCycle;

    let accumulated = 0;
    let activePhase = 0;

    for (let index = 0; index < normalizedPhases.length; index += 1) {
      accumulated += normalizedPhases[index]!.duration;
      if (elapsedInCycle < accumulated) {
        activePhase = index;
        break;
      }
    }

    if (activePhase !== phaseIndex) {
      setPhaseIndex(activePhase);
      onPhaseChange?.(activePhase, cycleIndex + 1);
    }

    const newCycleIndex = Math.floor(elapsed / totalPerCycle);
    if (newCycleIndex !== cycleIndex && newCycleIndex < cycles) {
      setCycleIndex(newCycleIndex);
    }

    if (elapsed >= totalDuration) {
      setIsRunning(false);
      onComplete?.();
    }
  }, [
    elapsed,
    normalizedPhases,
    cycles,
    totalDuration,
    phaseIndex,
    cycleIndex,
    onPhaseChange,
    onComplete,
  ]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const currentPhase = normalizedPhases[phaseIndex];
  const totalPerCycle =
    normalizedPhases.reduce((sum, phase) => sum + phase.duration, 0) || 1;
  const elapsedInCycle = elapsed % totalPerCycle;
  const priorDuration = normalizedPhases
    .slice(0, phaseIndex)
    .reduce((sum, phase) => sum + phase.duration, 0);
  const phaseElapsed = Math.max(0, elapsedInCycle - priorDuration);

  return {
    normalizedPhases,
    totalDuration,
    elapsed,
    cycleIndex,
    phaseIndex,
    isRunning,
    toggleRunning: () => setIsRunning((prev) => !prev),
    currentPhase,
    phaseRemaining: currentPhase
      ? Math.max(0, currentPhase.duration - phaseElapsed)
      : 0,
  };
}

export function InterventionTimer({
  phases,
  cycles = 1,
  autoStart = true,
  onPhaseChange,
  onComplete,
  className,
}: InterventionTimerProps) {
  const snapshot = useTimerSnapshot({
    phases,
    cycles,
    autoStart,
    onPhaseChange,
    onComplete,
  });

  const {
    normalizedPhases,
    totalDuration,
    elapsed,
    cycleIndex,
    phaseIndex,
    isRunning,
    toggleRunning,
    currentPhase,
    phaseRemaining,
  } = snapshot;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
        <span>
          Cycle {Math.min(cycleIndex + 1, cycles)} / {cycles}
        </span>
        <span>
          {totalDuration - elapsed > 0
            ? `${totalDuration - elapsed}s remaining`
            : "Complete"}
        </span>
      </div>

      <ProgressBar value={elapsed} max={totalDuration} />

      {currentPhase && (
        <div className="rounded-lg border bg-muted/40 p-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {currentPhase.label}
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {phaseRemaining > 0 ? `${phaseRemaining}s` : "Next"}
          </p>
          {currentPhase.prompt && (
            <p className="mt-2 text-sm text-muted-foreground">
              {currentPhase.prompt}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <button
          type="button"
          className="underline-offset-2 hover:underline"
          onClick={toggleRunning}
        >
          {isRunning ? "Pause" : "Resume"}
        </button>
        <span>
          {normalizedPhases.map((phase, index) => (
            <span
              key={`${phase.label}-${index}`}
              className={cn(
                "mx-0.5 inline-block h-2 w-2 rounded-full",
                index === phaseIndex ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
