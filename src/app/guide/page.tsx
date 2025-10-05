"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BookOpen,
  CircleCheck,
  Compass,
  Headphones,
  NotebookPen,
} from "lucide-react";
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

const SECTIONS = [
  {
    id: "mood",
    title: "Mood tracking",
    description:
      "Capture a daily pulse and annotate triggers to spot meaningful patterns.",
    bullets: [
      "Aim for consistent timing—morning or evening works best.",
      "Use the notes field to document context, wins, and challenges.",
      "Toggle between 7 and 30 day views to compare short vs long-term trends.",
    ],
    ctaLabel: "Visit mood workspace",
    href: "/dashboard/mood",
    icon: NotebookPen,
  },
  {
    id: "companion",
    title: "Realtime companion",
    description:
      "Live audio support with guardrails for crisis detection and escalation cues.",
    bullets: [
      "Wear headphones for clearer guidance and privacy.",
      "Use push-to-talk in shared spaces to keep the mic muted by default.",
      "Export or purge session history from the actions menu at any time.",
    ],
    ctaLabel: "Launch companion",
    href: "/dashboard/companion",
    icon: Headphones,
  },
  {
    id: "interventions",
    title: "Guided interventions",
    description:
      "Evidence-based grounding and breathing exercises tuned to your current mood signals.",
    bullets: [
      "Start with the recommended card to follow companion suggestions.",
      "Rate calmness changes honestly—this feeds future personalization.",
      "Pause or cancel anytime; your progress saves the moment you submit feedback.",
    ],
    ctaLabel: "Explore interventions",
    href: "/dashboard/interventions",
    icon: Compass,
  },
];

export default function GuidePage() {
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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 py-8">
      <Card className="rounded-3xl border bg-card/90 shadow-primary-glow">
        <CardHeader className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              User guide
            </p>
            <CardTitle className="text-4xl font-semibold tracking-tight">
              Navigate Octo-Calm with confidence
            </CardTitle>
            <CardDescription className="max-w-3xl text-muted-foreground">
              Keep this page handy for quick-start steps, escalation policies,
              and shortcuts into each workspace when you need them.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-2 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground sm:grid-cols-2">
          <span>✔ Bookmark for safety resources and policy refreshers.</span>
          <span>✔ Jump to any workspace in two taps from the cards below.</span>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {SECTIONS.map((section) => (
          <Card
            key={section.id}
            id={section.id}
            className="flex flex-col shadow-primary-glow"
          >
            <CardHeader>
              <div className="flex items-center gap-2">
                <section.icon className="h-5 w-5 text-primary" />
                <CardTitle>{section.title}</CardTitle>
              </div>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto space-y-2 text-sm text-muted-foreground">
              <ul className="space-y-2">
                {section.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2">
                    <CircleCheck className="mt-0.5 h-4 w-4 text-foreground" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" className="mt-4 w-full">
                <Link href={section.href}>{section.ctaLabel}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-rose-300 bg-rose-100/60 shadow-primary-glow">
        <CardHeader className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-rose-800">
            <AlertTriangle className="h-5 w-5" />
            <CardTitle>Crisis and safety resources</CardTitle>
          </div>
          <CardDescription className="text-rose-900/80">
            If you or someone you know is in immediate danger, contact local
            emergency services. The companion is not a substitute for
            professional help.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-rose-900">
          <p>
            • United States: Call or text <strong>988</strong> for the Suicide &
            Crisis Lifeline or chat via 988lifeline.org
          </p>
          <p>
            • United Kingdom & Ireland: Call{" "}
            <strong>Samaritans at 116 123</strong>
          </p>
          <p>
            • Canada: Call or text <strong>988</strong>
          </p>
          <p>
            • Australia: Call <strong>Lifeline at 13 11 14</strong>
          </p>
          <p>
            • Elsewhere: Visit{" "}
            <Link
              href="https://www.opencounseling.com/suicide-hotlines"
              target="_blank"
              className="underline"
            >
              global crisis hotline directory
            </Link>
          </p>
          <p>
            If you&apos;re unsure, pause the companion and reach out to a
            trusted contact or professional.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-muted/60 shadow-primary-glow">
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <CardTitle>Need a refresher later?</CardTitle>
          </div>
          <CardDescription>
            You can return here anytime from the dashboard navigation.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>Try the onboarding walkthrough for a guided orientation.</p>
          <Button asChild>
            <Link href="/onboarding">Replay onboarding</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
