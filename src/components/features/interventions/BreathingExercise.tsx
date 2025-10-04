"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CloudRain,
  Volume2,
  VolumeX,
  Waves as WavesIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  InterventionTimer,
  InterventionTimerPhase,
  TimerSnapshot,
} from "./InterventionTimer";
import { cn } from "@/lib/utils";

type AmbientMode = "off" | "rain" | "waves";

interface BreathingExerciseProps {
  cycles?: number;
  onComplete?: () => void;
  onCancel?: () => void;
  className?: string;
}

const BOX_PHASES: InterventionTimerPhase[] = [
  { label: "Inhale", duration: 4, prompt: "Breathe in slowly for four counts" },
  { label: "Hold", duration: 4, prompt: "Gently hold at the top" },
  { label: "Exhale", duration: 4, prompt: "Release the air softly" },
  { label: "Hold", duration: 4, prompt: "Rest before the next cycle" },
];

const AMBIENT_OPTIONS: {
  value: AmbientMode;
  label: string;
  description: string;
  icon: ReactNode;
}[] = [
  {
    value: "off",
    label: "Silence",
    description: "Follow companion voice only",
    icon: <VolumeX className="h-4 w-4" />,
  },
  {
    value: "rain",
    label: "Rainfall",
    description: "Soft rain with gentle shimmer",
    icon: <CloudRain className="h-4 w-4" />,
  },
  {
    value: "waves",
    label: "Ocean",
    description: "Rolling tide with slow swells",
    icon: <WavesIcon className="h-4 w-4" />,
  },
];

function startRainLayer(context: AudioContext, gain: GainNode) {
  const buffer = context.createBuffer(
    1,
    context.sampleRate * 2,
    context.sampleRate
  );
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) {
    data[index] = (Math.random() * 2 - 1) * 0.25;
  }

  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const highpass = context.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 180;

  const lowpass = context.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 1200;

  source.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(gain);
  source.start();

  return () => {
    source.stop();
    source.disconnect();
    highpass.disconnect();
    lowpass.disconnect();
  };
}

function startWaveLayer(context: AudioContext, gain: GainNode) {
  const buffer = context.createBuffer(
    1,
    context.sampleRate * 4,
    context.sampleRate
  );
  const data = buffer.getChannelData(0);
  let lastValue = 0;
  for (let index = 0; index < data.length; index += 1) {
    const whiteNoise = Math.random() * 2 - 1;
    lastValue += 0.02 * (whiteNoise - lastValue);
    data[index] = lastValue;
  }

  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 600;
  filter.Q.value = 0.7;

  const modulationGain = context.createGain();
  modulationGain.gain.value = 0.6;

  const lfo = context.createOscillator();
  lfo.frequency.value = 0.08;
  lfo.type = "sine";

  const lfoDepth = context.createGain();
  lfoDepth.gain.value = 0.4;
  lfo.connect(lfoDepth);
  lfoDepth.connect(modulationGain.gain);

  source.connect(filter);
  filter.connect(modulationGain);
  modulationGain.connect(gain);

  source.start();
  lfo.start();

  return () => {
    source.stop();
    lfo.stop();
    source.disconnect();
    filter.disconnect();
    modulationGain.disconnect();
    lfo.disconnect();
    lfoDepth.disconnect();
  };
}

function useAmbientSound(mode: AmbientMode, volume: number) {
  const contextRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const lastModeRef = useRef<AmbientMode>(mode);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (mode === "off") {
      stopRef.current?.();
      stopRef.current = null;
      if (gainRef.current) {
        gainRef.current.disconnect();
        gainRef.current = null;
      }
      lastModeRef.current = mode;
      return;
    }

    const audioCtor =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!audioCtor) return;

    let context = contextRef.current;
    if (!context) {
      context = new audioCtor();
      contextRef.current = context;
    }

    if (!context) return;

    if (context.state === "suspended") {
      context.resume().catch(() => undefined);
    }

    if (!gainRef.current) {
      const gain = context.createGain();
      gain.connect(context.destination);
      gainRef.current = gain;
    }

    if (gainRef.current) {
      gainRef.current.gain.value = volume;
    }

    if (lastModeRef.current !== mode || !stopRef.current) {
      stopRef.current?.();
      if (gainRef.current) {
        stopRef.current =
          mode === "rain"
            ? startRainLayer(context, gainRef.current)
            : startWaveLayer(context, gainRef.current);
      }
    }

    lastModeRef.current = mode;
  }, [mode, volume]);

  useEffect(() => {
    return () => {
      stopRef.current?.();
      if (gainRef.current) {
        gainRef.current.disconnect();
        gainRef.current = null;
      }
      if (contextRef.current) {
        contextRef.current.close().catch(() => undefined);
      }
    };
  }, []);
}

interface BreathingGuideProps {
  phase?: InterventionTimerPhase;
  phaseRemaining: number;
  phaseDuration: number;
  phaseIndex: number;
  cycle: number;
  cycles: number;
}

function BreathingGuide({
  phase,
  phaseRemaining,
  phaseDuration,
  phaseIndex,
  cycle,
  cycles,
}: BreathingGuideProps) {
  const progress =
    phaseDuration > 0 ? (phaseDuration - phaseRemaining) / phaseDuration : 0;
  const clamped = Math.min(Math.max(progress, 0), 1);

  let scale = 1;
  if (phase?.label === "Inhale") {
    scale = 0.8 + 0.3 * clamped;
  } else if (phase?.label === "Exhale") {
    scale = 1.1 - 0.3 * clamped;
  } else if (phase?.label === "Hold" && phaseIndex % BOX_PHASES.length === 1) {
    scale = 1.1;
  } else if (phase?.label === "Hold") {
    scale = 0.85;
  }

  const gradient =
    phase?.label === "Inhale"
      ? "from-cyan-200/70 via-sky-200/70 to-sky-100/70"
      : phase?.label === "Exhale"
      ? "from-amber-200/70 via-orange-200/60 to-rose-200/50"
      : "from-indigo-200/60 via-violet-200/50 to-slate-200/40";

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-4">
      <div className="relative flex h-56 w-56 items-center justify-center">
        <div
          className={cn(
            "absolute inset-0 rounded-full bg-gradient-to-br shadow-inner transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]",
            gradient
          )}
          style={{ transform: `scale(${scale})` }}
        />
        <div className="absolute inset-6 rounded-full border border-primary/30 backdrop-blur-sm" />
        <span className="relative text-lg font-semibold text-primary">
          {phase?.label ?? "Get ready"}
        </span>
        <span className="absolute bottom-6 text-sm text-muted-foreground">
          {phaseDuration > 0
            ? `${Math.max(0, Math.ceil(phaseRemaining))}s`
            : "--"}
        </span>
      </div>
      <div className="text-center text-sm text-muted-foreground">
        <p className="font-medium text-foreground">
          {phase?.prompt ?? "Sync your breath with the animation."}
        </p>
        <p className="text-xs uppercase tracking-wide">
          Cycle {Math.min(cycle, cycles)} of {cycles}
        </p>
      </div>
    </div>
  );
}

export function BreathingExercise({
  cycles = 6,
  onComplete,
  onCancel,
  className,
}: BreathingExerciseProps) {
  const [showTips, setShowTips] = useState(false);
  const [ambientMode, setAmbientMode] = useState<AmbientMode>("off");
  const [ambientVolume, setAmbientVolume] = useState(40);
  const [phaseRemaining, setPhaseRemaining] = useState(BOX_PHASES[0].duration);
  const [phaseDuration, setPhaseDuration] = useState(BOX_PHASES[0].duration);
  const [currentPhase, setCurrentPhase] = useState<
    InterventionTimerPhase | undefined
  >(BOX_PHASES[0]);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [cycleIndex, setCycleIndex] = useState(1);

  const normalizedVolume = Math.min(Math.max(ambientVolume / 100, 0), 1);
  useAmbientSound(ambientMode, normalizedVolume);

  const totalDuration = useMemo(
    () => BOX_PHASES.reduce((sum, phase) => sum + phase.duration, 0) * cycles,
    [cycles]
  );

  const handleSnapshot = (snapshot: TimerSnapshot) => {
    setPhaseRemaining(snapshot.phaseRemaining);
    setPhaseDuration(
      snapshot.currentPhase?.duration ??
        BOX_PHASES[snapshot.phaseIndex]?.duration ??
        BOX_PHASES[0].duration
    );
    setCurrentPhase(
      snapshot.currentPhase ?? BOX_PHASES[snapshot.phaseIndex] ?? BOX_PHASES[0]
    );
    setPhaseIndex(snapshot.phaseIndex);
    setCycleIndex(Math.min(snapshot.cycleIndex + 1, cycles));
  };

  const handlePhaseChange = (index: number, cycle: number) => {
    setPhaseIndex(index);
    setCurrentPhase(BOX_PHASES[index]);
    setPhaseDuration(BOX_PHASES[index].duration);
    setCycleIndex(Math.min(cycle, cycles));
  };

  useEffect(() => {
    if (typeof navigator === "undefined" || !("vibrate" in navigator)) {
      return;
    }
    if (!currentPhase) return;

    const vibrationPattern: Record<string, number[]> = {
      Inhale: [120, 40, 120],
      Exhale: [200],
      Hold: [30],
    };
    const pattern = vibrationPattern[currentPhase.label];
    if (pattern) {
      navigator.vibrate(pattern);
    }
  }, [currentPhase]);

  return (
    <Card className={cn("h-full border-primary/20", className)}>
      <CardHeader className="border-b bg-gradient-to-r from-sky-100/60 via-primary/5 to-transparent">
        <CardTitle className="text-xl font-semibold">
          Box Breathing 90s
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Follow the 4-4-4-4 rhythm with synchronized audio cues. Pair it with a
          visual guide and optional ambient sound for deeper calm.
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

        <BreathingGuide
          phase={currentPhase}
          phaseRemaining={phaseRemaining}
          phaseDuration={phaseDuration}
          phaseIndex={phaseIndex}
          cycle={cycleIndex}
          cycles={cycles}
        />

        <InterventionTimer
          phases={BOX_PHASES}
          cycles={cycles}
          onPhaseChange={handlePhaseChange}
          onSnapshotChange={handleSnapshot}
          onComplete={onComplete}
        />

        <div className="space-y-3 rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Ambient layer
          </p>
          <div className="flex flex-wrap gap-2">
            {AMBIENT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setAmbientMode(option.value)}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium transition",
                  ambientMode === option.value
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-transparent bg-background/60 text-muted-foreground hover:border-muted"
                )}
                aria-pressed={ambientMode === option.value}
              >
                {option.icon}
                {option.label}
              </button>
            ))}
          </div>
          {ambientMode !== "off" && (
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                {ambientVolume > 0 ? (
                  <Volume2 className="h-3.5 w-3.5" />
                ) : (
                  <VolumeX className="h-3.5 w-3.5" />
                )}{" "}
                Ambient volume
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={ambientVolume}
                onChange={(event) =>
                  setAmbientVolume(Number(event.target.value))
                }
                className="h-1 w-full cursor-pointer appearance-none rounded-full bg-primary/20 accent-primary"
              />
              <p className="text-[11px] text-muted-foreground">
                {
                  AMBIENT_OPTIONS.find((option) => option.value === ambientMode)
                    ?.description
                }
              </p>
            </div>
          )}
        </div>

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
