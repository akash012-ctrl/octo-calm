"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Headphones, Mic, NotebookPen, Shield } from "lucide-react";
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

const PREP_STEPS = [
  "Pop on headphones and confirm the right microphone is selected.",
  "Take two slow breaths before you press start.",
  "Name one focus area so the companion can stay on track.",
];

const FOLLOW_UPS = [
  "Ask the companion for a recap before you disconnect.",
  "Tap Generate summary to capture the clinical note.",
  "Download the JSON if you need to share it securely.",
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
      <Card className="rounded-3xl border bg-card/90 shadow-primary-glow">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-primary">
              <Headphones className="h-4 w-4" /> Voice companion
            </div>
            <CardTitle className="text-3xl font-semibold tracking-tight">
              Speak with a steady psychiatrist in real time
            </CardTitle>
            <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <li className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                The companion listens for emotion, mirrors back themes, and
                keeps safety top of mind.
              </li>
              <li className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                When you wrap, generate a summary to capture key points and next
                steps instantly.
              </li>
            </ul>
          </div>
          <Button
            asChild
            variant="outline"
            className="w-full max-w-xs lg:w-auto"
          >
            <Link href="/guide#companion">Review safety notes</Link>
          </Button>
        </CardHeader>
      </Card>

      <Card className="border-amber-200 bg-amber-50/60 text-amber-900 shadow-primary-glow">
        <CardHeader className="flex flex-row items-center gap-3">
          <Shield className="h-5 w-5" />
          <div>
            <CardTitle className="text-base">Keep privacy in focus</CardTitle>
            <CardDescription className="text-amber-900/80">
              Conversations stay in your session until you save a summary. You
              can clear everything at any time.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <VoiceCompanion className="min-h-[560px] rounded-3xl border border-primary/20 bg-card/95 shadow-primary-glow" />

        <div className="space-y-4">
          <Card className="shadow-primary-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5" /> Before you connect
              </CardTitle>
              <CardDescription>
                Give the model a clean signal and a clear goal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <ol className="space-y-2">
                {PREP_STEPS.map((step, index) => (
                  <li key={step}>{`${index + 1}. ${step}`}</li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card className="shadow-primary-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <NotebookPen className="h-5 w-5" /> After the conversation
              </CardTitle>
              <CardDescription>
                Close the loop while everything is fresh.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <ul className="space-y-2">
                {FOLLOW_UPS.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
