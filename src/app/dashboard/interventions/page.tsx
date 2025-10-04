"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BrainCircuit,
  CircleDot,
  Compass,
  ListChecks,
  Sparkles,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AuthLoading from "@/components/shared/AuthLoading";
import { useAuth } from "@/lib/context/AuthContext";
import { useMoodCheckIns } from "@/lib/hooks/useMoodCheckIns";
import { InterventionHub } from "@/components/features/interventions";

const MICRO_INTERVENTIONS = [
  {
    title: "Grounding 5-4-3-2-1",
    description:
      "Anchors your senses when anxiety spikes and thought loops form.",
  },
  {
    title: "Box Breathing 4-4-4-4",
    description: "Balances arousal and attention with steady rhythm coaching.",
  },
  {
    title: "Companion prompts",
    description:
      "Session insights automatically tailor suggested practices and guardrails.",
  },
];

export default function InterventionsWorkspacePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { checkIns, fetchCheckIns, isLoading } = useMoodCheckIns();

  useEffect(() => {
    if (user) {
      void fetchCheckIns("30days");
    }
  }, [user, fetchCheckIns]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  const baselineMood = useMemo(() => checkIns[0]?.mood ?? null, [checkIns]);

  if (loading) {
    return <AuthLoading />;
  }

  if (!user) {
    return <AuthLoading />;
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-2">
          <p className="text-sm text-muted-foreground">Guided interventions</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Practice science-backed resets when you need them most
          </h1>
          <p className="text-sm text-muted-foreground">
            Choose a companion-led exercise or follow the recommended sequence
            curated from your latest mood signals and real-time session
            insights. Feedback loops improve guidance every time you complete
            one.
          </p>
        </div>
        <Button asChild variant="outline" className="w-full max-w-xs lg:w-auto">
          <Link href="/dashboard/mood">Review recent moods</Link>
        </Button>
      </header>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="flex flex-row items-center gap-3">
          <Sparkles className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-base">
              Companion recommendations adapt to you
            </CardTitle>
            <CardDescription>
              Complete an exercise to unlock personalization—your calmness
              rating tunes future suggestions and realtime guardrails.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <InterventionHub recentCheckIns={checkIns} className="min-h-[520px]" />

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="h-5 w-5" /> How the flow works
              </CardTitle>
              <CardDescription>
                From start to saved insights in under three minutes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <ol className="space-y-2">
                <li>
                  1. Pick an exercise or launch one recommended beside your
                  companion session.
                </li>
                <li>
                  2. Follow the guided voice prompts—captions available for
                  every step.
                </li>
                <li>
                  3. Rate the helpfulness and share your calmness change to
                  shape what appears next.
                </li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BrainCircuit className="h-5 w-5" /> Why these work
              </CardTitle>
              <CardDescription>
                Short resets built for acute stress and overwhelm.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              {MICRO_INTERVENTIONS.map((item) => (
                <div key={item.title}>
                  <p className="font-medium text-foreground">{item.title}</p>
                  <p>{item.description}</p>
                </div>
              ))}
              <div className="pt-2">
                <Link
                  href="/guide#interventions"
                  className="inline-flex items-center text-sm font-medium text-primary hover:underline"
                >
                  Learn more in the guide <Compass className="ml-1 h-4 w-4" />
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CircleDot className="h-5 w-5" /> Baseline mood
              </CardTitle>
              <CardDescription>Recent average from your logs.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {baselineMood ? `${baselineMood}/5` : "––"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Interventions reference this to suggest intensity and pacing.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">
          Loading recent check-ins…
        </p>
      )}
    </div>
  );
}
