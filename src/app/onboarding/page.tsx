"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowRight, Compass, Headphones, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import AuthLoading from "@/components/shared/AuthLoading";
import { useAuth } from "@/lib/context/AuthContext";

const ONBOARDING_STEPS = [
  {
    number: 1,
    title: "Mood check-ins",
    description:
      "Log how you feel in under a minute. Add context and tags so insights stay meaningful.",
    actionLabel: "Open mood workspace",
    href: "/dashboard/mood",
    icon: Sparkles,
  },
  {
    number: 2,
    title: "Realtime companion",
    description:
      "Start a guided audio session with built-in guardrails, captions, and history snapshot.",
    actionLabel: "Launch companion",
    href: "/dashboard/companion",
    icon: Headphones,
  },
  {
    number: 3,
    title: "Guided interventions",
    description:
      "Practice grounding or breathing exercises tuned to your current mood and session data.",
    actionLabel: "Explore interventions",
    href: "/dashboard/interventions",
    icon: Compass,
  },
];

export default function OnboardingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return <AuthLoading />;
  }

  if (!user) {
    return <AuthLoading />;
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 py-8">
      <Card className="rounded-3xl border bg-card/90 shadow-primary-glow">
        <CardHeader className="space-y-4 text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">
            Welcome to Octo-Calm
          </p>
          <CardTitle className="text-4xl font-semibold tracking-tight">
            Your companion in three quick steps
          </CardTitle>
          <CardDescription className="mx-auto max-w-2xl text-sm text-muted-foreground">
            Follow this micro-tour to log a mood, try the voice companion, and
            complete a grounding exercise. You can replay it anytime from the
            dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 pb-8">
          <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
            <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1">
              1 · Log how you feel
            </span>
            <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1">
              2 · Talk with the companion
            </span>
            <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1">
              3 · Reset with an exercise
            </span>
          </div>
          <Button asChild size="lg" className="gap-2">
            <Link href="/dashboard">
              Enter dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {ONBOARDING_STEPS.map((step) => (
          <Card
            key={step.number}
            className="relative flex flex-col shadow-primary-glow"
          >
            <CardHeader>
              <div className="absolute -top-4 left-4 flex h-10 w-10 items-center justify-center rounded-full border border-primary bg-background text-sm font-semibold text-primary shadow">
                {step.number}
              </div>
              <div className="flex items-center gap-2 pt-6">
                <step.icon className="h-5 w-5 text-primary" />
                <CardTitle>{step.title}</CardTitle>
              </div>
              <CardDescription>{step.description}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button asChild variant="outline" className="w-full">
                <Link href={step.href}>{step.actionLabel}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="border-muted-foreground/20 bg-muted/40 shadow-primary-glow">
        <CardHeader>
          <CardTitle>Help when you need it</CardTitle>
          <CardDescription>
            Escalation resources and usage policies are available in the user
            guide.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>
            If you ever encounter crisis cues, reach out to local emergency
            services immediately before continuing with the companion.
          </p>
          <Button asChild variant="secondary">
            <Link href="/guide">Open the user guide</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
