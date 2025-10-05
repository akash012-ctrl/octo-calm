"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { format, isToday } from "date-fns";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Compass,
  Headphones,
  Sparkles,
  TrendingUp,
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
      <header className="rounded-3xl border bg-card/90 px-6 py-7 shadow-primary-glow sm:flex sm:items-center sm:justify-between">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome back, {currentUser.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-primary">
              Focus your next move
            </span>
            <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
              <span className="rounded-full bg-primary/20 px-2 py-1 text-primary">
                Log a mood
              </span>
              <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">
                Talk things out
              </span>
              <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">
                Reset fast
              </span>
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3 sm:mt-0 sm:justify-end">
          <Link href="/onboarding">
            <Button variant="outline" className="w-full sm:w-auto">
              <Sparkles className="mr-2 h-4 w-4" /> Tour
            </Button>
          </Link>
          <Link href="/guide">
            <Button variant="secondary" className="w-full sm:w-auto">
              <Compass className="mr-2 h-4 w-4" /> Guide
            </Button>
          </Link>
          <Button variant="ghost" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="h-full border border-primary/20 bg-card/95 shadow-primary-glow">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                Today&apos;s check-in
              </CardTitle>
              <p className="mt-2 text-2xl font-semibold">
                {hasCheckedInToday ? "Logged" : "Pending"}
              </p>
            </div>
            <CheckCircle2 className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              {hasCheckedInToday
                ? "Nice streak—keep the rhythm."
                : "Tap in once today to stay calibrated."}
            </p>
            <Link
              href="/dashboard/mood"
              className="inline-flex items-center font-medium text-primary hover:underline"
            >
              Open mood workspace <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </CardContent>
        </Card>

        <Card className="h-full border bg-card/95 shadow-primary-glow">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                Last entry
              </CardTitle>
              <p className="mt-2 text-2xl font-semibold">
                {lastCheckIn
                  ? ["😢", "😔", "😐", "🙂", "😊"][lastCheckIn.mood - 1]
                  : "––"}
              </p>
            </div>
            <CalendarDays className="h-6 w-6 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              {lastCheckIn
                ? format(new Date(lastCheckIn.timestamp), "MMM d · h:mma")
                : "No check-ins yet."}
            </p>
            <p className="text-xs uppercase tracking-wide text-muted-foreground/80">
              {checkIns.length} in the last 30 days
            </p>
          </CardContent>
        </Card>

        <Card className="h-full border bg-card/95 shadow-primary-glow">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                Mood trend
              </CardTitle>
              <p className="mt-2 text-2xl font-semibold">
                {averageMood !== null ? `${averageMood}/5` : "––"}
              </p>
            </div>
            <TrendingUp className="h-6 w-6 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              {averageMood !== null
                ? "Steady over your selected range."
                : "Log a few entries to unlock insights."}
            </p>
            <Link
              href="/dashboard/mood#trends"
              className="inline-flex items-center font-medium text-primary hover:underline"
            >
              View chart <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </CardContent>
        </Card>

        <Card className="h-full border bg-card/95 shadow-primary-glow">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                Quick win
              </CardTitle>
              <p className="mt-2 text-2xl font-semibold">Replay tour</p>
            </div>
            <Sparkles className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Refresh the walkthrough to see what&apos;s new.</p>
            <Link
              href="/onboarding"
              className="inline-flex items-center font-medium text-primary hover:underline"
            >
              Start tour <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1 border bg-card/95 shadow-primary-glow">
          <CardHeader className="space-y-1">
            <CardTitle>Log feelings</CardTitle>
            <CardDescription className="text-sm">
              Capture mood, notes, and tags in under a minute.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p className="inline-flex items-center gap-2 font-medium text-foreground">
              <CalendarDays className="h-4 w-4 text-primary" /> Daily rhythm
            </p>
            <Link href="/dashboard/mood">
              <Button variant="outline" className="mt-1">
                Open mood tools
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1 border bg-card/95 shadow-primary-glow">
          <CardHeader className="space-y-1">
            <CardTitle>Go realtime</CardTitle>
            <CardDescription className="text-sm">
              Voice support with live guardrails and captions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p className="inline-flex items-center gap-2 font-medium text-foreground">
              <Headphones className="h-4 w-4 text-primary" /> Guided
              conversation
            </p>
            <Link href="/dashboard/companion">
              <Button variant="outline" className="mt-1">
                Launch companion
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1 border bg-card/95 shadow-primary-glow">
          <CardHeader className="space-y-1">
            <CardTitle>Reset fast</CardTitle>
            <CardDescription className="text-sm">
              Try grounding and breathing exercises curated for you.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p className="inline-flex items-center gap-2 font-medium text-foreground">
              <Sparkles className="h-4 w-4 text-primary" /> Micro interventions
            </p>
            <Link href="/dashboard/interventions">
              <Button variant="outline" className="mt-1">
                Explore routines
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-3xl border bg-card/90 px-6 py-6 shadow-primary-glow">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Need a quick refresher?</h2>
            <p className="text-sm text-muted-foreground">
              The guide bundles walkthroughs, safety notes, and escalation steps
              in one place.
            </p>
          </div>
          <Link href="/guide">
            <Button variant="secondary" className="w-full sm:w-auto">
              Open guide
            </Button>
          </Link>
        </div>
      </section>

      {isLoading && (
        <p className="text-sm text-muted-foreground">
          Loading your recent activity…
        </p>
      )}
    </div>
  );
}
