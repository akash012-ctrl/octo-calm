"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  differenceInCalendarDays,
  format,
  isToday,
  startOfDay,
} from "date-fns";
import {
  Activity,
  CalendarDays,
  Notebook,
  RotateCcw,
  Sparkles,
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
import {
  MoodCheckInForm,
  MoodChart,
  MoodHistory,
} from "@/components/features/mood-tracker";
import { useAuth } from "@/lib/context/AuthContext";
import { useMoodCheckIns } from "@/lib/hooks/useMoodCheckIns";
import type { MoodCheckInFormData } from "@/lib/validation/mood-schemas";

const MOOD_EMOJI = ["😢", "😔", "😐", "🙂", "😊"] as const;

export default function MoodWorkspacePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const {
    checkIns,
    fetchCheckIns,
    isLoading: checkInsLoading,
    error,
    submitCheckIn,
  } = useMoodCheckIns();
  const [showForm, setShowForm] = useState(false);
  const [selectedRange, setSelectedRange] = useState<"7days" | "30days">(
    "7days"
  );

  useEffect(() => {
    if (user) {
      void fetchCheckIns(selectedRange);
    }
  }, [user, fetchCheckIns, selectedRange]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  const sortedCheckIns = useMemo(() => {
    return checkIns
      .slice()
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  }, [checkIns]);

  const lastCheckIn = sortedCheckIns[0] ?? null;
  const hasCheckedInToday = sortedCheckIns.some((entry) =>
    isToday(new Date(entry.timestamp))
  );

  const streak = useMemo(() => {
    if (!sortedCheckIns.length) {
      return 0;
    }

    let streakCount = 1;
    let previousDay = startOfDay(new Date(sortedCheckIns[0].timestamp));

    for (let index = 1; index < sortedCheckIns.length; index += 1) {
      const currentDay = startOfDay(new Date(sortedCheckIns[index].timestamp));
      const diff = differenceInCalendarDays(previousDay, currentDay);

      if (diff === 0) {
        // duplicate entries on the same day shouldn't break the streak
        continue;
      }

      if (diff === 1) {
        streakCount += 1;
        previousDay = currentDay;
        continue;
      }

      break;
    }

    return streakCount;
  }, [sortedCheckIns]);

  const averageMood = useMemo(() => {
    if (!sortedCheckIns.length) return null;
    const total = sortedCheckIns.reduce((sum, entry) => sum + entry.mood, 0);
    return Math.round((total / sortedCheckIns.length) * 10) / 10;
  }, [sortedCheckIns]);

  if (loading || (!loading && !user)) {
    return <AuthLoading />;
  }

  const handleSubmit = async (data: MoodCheckInFormData) => {
    await submitCheckIn(data);
    setShowForm(false);
  };

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border bg-card/90 px-6 py-6 shadow-primary-glow">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Mood workspace
            </span>
            <h1 className="text-3xl font-semibold tracking-tight">
              Track feelings. Spot patterns.
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Log once a day, review your trendline, and adjust the companion
              based on what you notice.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant={showForm ? "secondary" : "default"}
              onClick={() => setShowForm((prev) => !prev)}
              className="w-full sm:w-auto"
            >
              {showForm ? "Hide form" : "New check-in"}
            </Button>
            <div className="flex overflow-hidden rounded-full border border-primary/20 bg-background/80 text-xs font-medium uppercase tracking-wide">
              {(["7days", "30days"] as const).map((range) => (
                <button
                  key={range}
                  type="button"
                  className={`px-3 py-1 transition ${
                    selectedRange === range
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                  onClick={() => setSelectedRange(range)}
                >
                  {range === "7days" ? "7 days" : "30 days"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border border-primary/20 bg-card/95 shadow-primary-glow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Today&apos;s status
              </CardTitle>
              <CardDescription>
                {hasCheckedInToday
                  ? "You&apos;re all caught up."
                  : "Log once to keep momentum."}
              </CardDescription>
            </div>
            <Activity className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-semibold">
              {hasCheckedInToday ? "Logged" : "Pending"}
            </p>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Range · {selectedRange === "7days" ? "7 days" : "30 days"}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-primary/20 bg-card/95 shadow-primary-glow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Current streak
              </CardTitle>
              <CardDescription>
                Consecutive days with a check-in.
              </CardDescription>
            </div>
            <RotateCcw className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-semibold">{streak}</p>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Quick note entries still count
            </p>
          </CardContent>
        </Card>

        <Card className="border border-primary/20 bg-card/95 shadow-primary-glow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Average mood
              </CardTitle>
              <CardDescription>Across your selected timeframe.</CardDescription>
            </div>
            <CalendarDays className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-semibold">
              {averageMood !== null ? `${averageMood}/5` : "––"}
            </p>
            {lastCheckIn ? (
              <p className="text-sm text-muted-foreground">
                Last entry{" "}
                {format(new Date(lastCheckIn.timestamp), "MMM d · h:mm a")}{" "}
                {MOOD_EMOJI[lastCheckIn.mood - 1]}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Your first log unlocks insights.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      {!hasCheckedInToday && !showForm && (
        <Card className="border-primary/30 bg-primary/5 shadow-primary-glow">
          <CardHeader className="flex flex-row items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">
                Haven&apos;t checked in yet today?
              </CardTitle>
              <CardDescription>
                Capture a quick snapshot—it only takes a minute and keeps your
                streak alive.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowForm(true)}>
              Open check-in form
            </Button>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <div className="rounded-2xl border bg-card/60 p-6 shadow-primary-glow">
          <MoodCheckInForm
            onSubmit={handleSubmit}
            className="mx-auto max-w-2xl"
          />
        </div>
      )}

      <section
        id="trends"
        className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]"
      >
        <Card className="lg:col-span-1 shadow-primary-glow">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Mood trendline</CardTitle>
              <CardDescription>
                Explore how your mood shifts across the selected timeframe.
              </CardDescription>
            </div>
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <MoodChart checkIns={sortedCheckIns} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-1 shadow-primary-glow">
          <CardHeader>
            <CardTitle>Reflection prompts</CardTitle>
            <CardDescription>
              Use these questions to add context to your next entry.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Notebook className="mt-1 h-4 w-4 text-primary" />
                Name one moment that shifted your mood today.
              </li>
              <li className="flex items-start gap-2">
                <RotateCcw className="mt-1 h-4 w-4 text-primary" />
                Recall a similar day—what eased it last time?
              </li>
              <li className="flex items-start gap-2">
                <Activity className="mt-1 h-4 w-4 text-primary" />
                Flag a companion cue to tweak before your next chat.
              </li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-2xl border bg-card/50 p-6 shadow-primary-glow">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Recent entries</h2>
            <p className="text-sm text-muted-foreground">
              Add notes and triggers so the companion can personalize
              interventions.
            </p>
          </div>
          <Link href="/dashboard/interventions">
            <Button variant="outline" className="max-w-sm">
              View recommended interventions
            </Button>
          </Link>
        </div>
        <div className="mt-6">
          <MoodHistory checkIns={sortedCheckIns} isLoading={checkInsLoading} />
        </div>
      </section>

      {error && (
        <Card className="border-rose-300 bg-rose-100/70 shadow-primary-glow">
          <CardContent>
            <p className="text-sm font-medium text-rose-900">{error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
