"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { format, isToday } from "date-fns";
import {
  ArrowRight,
  CalendarDays,
  Compass,
  Headphones,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
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
import { signOut } from "@/lib/appwrite/auth-new";
import { useMoodCheckIns } from "@/lib/hooks/useMoodCheckIns";

export default function DashboardPage() {
  const { user, loading, refreshUser } = useAuth();
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

  const lastCheckIn = checkIns[0] ?? null;
  const hasCheckedInToday = checkIns.some((entry) =>
    isToday(new Date(entry.timestamp))
  );

  const averageMood = useMemo(() => {
    if (!checkIns.length) return null;
    const total = checkIns.reduce((sum, entry) => sum + entry.mood, 0);
    return Math.round((total / checkIns.length) * 10) / 10;
  }, [checkIns]);

  if (loading || (!loading && !user)) {
    return <AuthLoading />;
  }

  const currentUser = user!;

  const handleSignOut = async () => {
    await signOut();
    await refreshUser();
    router.replace("/login");
  };

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-6 rounded-2xl border bg-background p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Welcome back, {currentUser.name} 👋
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Pick where you want to focus today: track your mood, start a
            companion session, or try a guided exercise. Need a refresher?
            Explore the onboarding tour or quick-start guide below.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/onboarding">
            <Button variant="outline" className="w-full sm:w-auto">
              <Sparkles className="mr-2 h-4 w-4" /> Take the tour
            </Button>
          </Link>
          <Link href="/guide">
            <Button variant="secondary" className="w-full sm:w-auto">
              <Compass className="mr-2 h-4 w-4" /> Open guide
            </Button>
          </Link>
          <Button variant="ghost" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-primary">
              Today&apos;s status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-2xl font-semibold">
              {hasCheckedInToday ? "Mood logged" : "Check-in pending"}
            </p>
            <p className="text-sm text-muted-foreground">
              {hasCheckedInToday
                ? "Great job staying consistent."
                : "Log a quick check-in to personalize your companion."}
            </p>
            <Link
              href="/dashboard/mood"
              className="inline-flex items-center text-sm font-medium text-primary hover:underline"
            >
              Go to mood tools <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide">
              Last check-in
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lastCheckIn ? (
              <>
                <p className="text-2xl">
                  {["😢", "😔", "😐", "🙂", "😊"][lastCheckIn.mood - 1]}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(lastCheckIn.timestamp), "MMM d 'at' h:mm a")}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No check-ins recorded yet.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              {checkIns.length
                ? `${checkIns.length} entries in the last 30 days.`
                : "Your history is ready to grow."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide">
              Mood trend
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-2xl font-semibold">
              {averageMood !== null ? `${averageMood}/5` : "––"}
            </p>
            <p className="text-sm text-muted-foreground">
              {averageMood !== null
                ? "Average score across your recent check-ins."
                : "Start logging to see trend insights."}
            </p>
            <Link
              href="/dashboard/mood#trends"
              className="inline-flex items-center text-sm font-medium text-primary hover:underline"
            >
              View detailed chart <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide">
              Upcoming focus
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-2xl font-semibold">Replay onboarding</p>
            <p className="text-sm text-muted-foreground">
              Spend two minutes reviewing the platform tips to get the most out
              of the companion.
            </p>
            <Link
              href="/onboarding"
              className="inline-flex items-center text-sm font-medium text-primary hover:underline"
            >
              Start walkthrough <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>1. Track your mood</CardTitle>
            <CardDescription>
              Log how you&apos;re feeling, capture triggers, and review past
              entries.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p className="inline-flex items-center font-medium text-foreground">
              <CalendarDays className="mr-2 h-4 w-4" /> Daily reflections
            </p>
            <p>
              Start with a quick check-in to personalize your recommendations.
            </p>
            <Link href="/dashboard/mood">
              <Button variant="outline" className="mt-3">
                Open mood workspace
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>2. Talk with the companion</CardTitle>
            <CardDescription>
              Start a live voice session for coached breathing, grounding, and
              real-time support.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p className="inline-flex items-center font-medium text-foreground">
              <Headphones className="mr-2 h-4 w-4" /> Realtime audio guidance
            </p>
            <p>
              Connect your microphone and explore guardrails, transcripts, and
              session history.
            </p>
            <Link href="/dashboard/companion">
              <Button variant="outline" className="mt-3">
                Launch companion session
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>3. Practice guided exercises</CardTitle>
            <CardDescription>
              Recharge with short interventions tailored to your current mood.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p className="inline-flex items-center font-medium text-foreground">
              <Sparkles className="mr-2 h-4 w-4" /> Proven calming routines
            </p>
            <p>
              Choose from grounding and breathing practices with voice and
              caption support.
            </p>
            <Link href="/dashboard/interventions">
              <Button variant="outline" className="mt-3">
                Explore interventions
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-2xl border bg-background p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Need a quick orientation?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Visit the{" "}
          <Link
            href="/guide"
            className="font-medium text-primary hover:underline"
          >
            User Guide
          </Link>{" "}
          for step-by-step instructions, session tips, and safety resources. You
          can revisit the onboarding walkthrough any time to refresh the core
          concepts.
        </p>
      </section>

      {isLoading && (
        <p className="text-sm text-muted-foreground">
          Loading your recent activity…
        </p>
      )}
    </div>
  );
}
