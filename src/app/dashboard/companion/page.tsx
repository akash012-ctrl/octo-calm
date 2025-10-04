"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BookOpenCheck,
  Headphones,
  Mic,
  Shield,
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
import { VoiceCompanion } from "@/components/features/chat/VoiceCompanion";

const QUICK_TIPS = [
  {
    icon: Mic,
    title: "Check your mic",
    description:
      "Use headphones whenever possible and confirm your browser mic permissions are enabled before starting.",
  },
  {
    icon: Shield,
    title: "Guardrails always on",
    description:
      "Crisis detection, escalation cues, and policy filters run live. You can see status from the alert badges.",
  },
  {
    icon: BookOpenCheck,
    title: "Log takeaways",
    description:
      "Use the session history snapshot to jot down breakthroughs and link them to your next mood check-in.",
  },
];

export default function CompanionWorkspacePage() {
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
    <div className="space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm text-muted-foreground">Realtime companion</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Start a guided conversation with instant guardrails
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The companion mirrors supportive coaching—ground yourself, practice
            exercises, and capture insights while guardrails monitor for
            escalation. Your microphone data stays local and is never stored.
          </p>
        </div>
        <Button asChild variant="outline" className="w-full max-w-xs lg:w-auto">
          <Link href="/guide#companion">Review safety guidelines</Link>
        </Button>
      </header>

      <Card className="border-amber-200 bg-amber-50/60 text-amber-900">
        <CardHeader className="flex flex-row items-center gap-3">
          <AlertTriangle className="h-5 w-5" />
          <div>
            <CardTitle className="text-base">
              Use headphones for the best experience
            </CardTitle>
            <CardDescription className="text-amber-900/80">
              Enable push-to-talk if you&apos;re in a shared space. You can
              pause or end the session anytime—your guardrails will immediately
              clear when you disconnect.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <VoiceCompanion className="min-h-[560px]" />

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Headphones className="h-5 w-5" /> Get grounded before you speak
              </CardTitle>
              <CardDescription>
                A short prep ritual helps the model adapt to your tone and pace.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <ol className="space-y-2">
                <li>1. Find a quiet spot and take three steady breaths.</li>
                <li>
                  2. Decide what you&apos;d like to explore—mood shift, trigger,
                  or goal.
                </li>
                <li>
                  3. Toggle captions if you want a live transcript, and remember
                  sessions save locally.
                </li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick tips</CardTitle>
              <CardDescription>Make the most of each session.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {QUICK_TIPS.map((tip) => (
                <div
                  key={tip.title}
                  className="flex gap-3 text-sm text-muted-foreground"
                >
                  <tip.icon className="mt-0.5 h-4 w-4 text-foreground" />
                  <div>
                    <p className="font-medium text-foreground">{tip.title}</p>
                    <p>{tip.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
