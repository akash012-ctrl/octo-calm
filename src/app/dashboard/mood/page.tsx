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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Mood workspace</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Track your feelings, find your patterns
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Log a daily check-in, watch your trendline move, and surface
            triggers and boosts that matter. Use the charts to reflect and
            tailor the companion to your needs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={showForm ? "secondary" : "default"}
            onClick={() => setShowForm((prev) => !prev)}
            className="w-full sm:w-auto"
          >
            {showForm ? "Hide check-in form" : "Log a new check-in"}
          </Button>
          <div className="flex overflow-hidden rounded-full border">
            {(["7days", "30days"] as const).map((range) => (
              <button
                key={range}
                type="button"
                className={`px-3 py-1 text-xs uppercase tracking-wide transition ${
                  selectedRange === range
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted"
                }`}
                onClick={() => setSelectedRange(range)}
              >
                {range === "7days" ? "7 days" : "30 days"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Today&apos;s status
            </CardTitle>
            <CardDescription>
              {hasCheckedInToday
                ? "You&apos;re all caught up."
                : "Check in to stay on your streak."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-semibold">
              {hasCheckedInToday ? "Logged" : "Pending"}
            </p>
            <p className="text-sm text-muted-foreground">
              Showing{" "}
              {selectedRange === "7days"
                ? "your past week"
                : "the last 30 days"}
              .
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Current streak
            </CardTitle>
            <CardDescription>Consecutive days with a check-in.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-semibold">{streak}</p>
            <p className="text-sm text-muted-foreground">
              Keep momentum going—even a quick note counts.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Average mood
            </CardTitle>
            <CardDescription>Across your selected timeframe.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-semibold">
              {averageMood !== null ? `${averageMood}/5` : "––"}
            </p>
            {lastCheckIn ? (
              <p className="text-sm text-muted-foreground">
                Last entry{" "}
                {format(new Date(lastCheckIn.timestamp), "MMM d 'at' h:mm a")}{" "}
                {MOOD_EMOJI[lastCheckIn.mood - 1]}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No entries yet—your insights begin with the first log.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      {!hasCheckedInToday && !showForm && (
        <Card className="border-primary/30 bg-primary/5">
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
        <div className="rounded-2xl border bg-card/60 p-6">
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
        <Card className="lg:col-span-1">
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

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Reflection prompts</CardTitle>
            <CardDescription>
              Use these questions to add context to your next entry.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p className="flex items-start gap-2">
              <Notebook className="mt-1 h-4 w-4 text-foreground" />
              What moments today noticeably shifted your mood?
            </p>
            <p className="flex items-start gap-2">
              <RotateCcw className="mt-1 h-4 w-4 text-foreground" />
              When did you last feel similar, and what helped?
            </p>
            <p className="flex items-start gap-2">
              <Activity className="mt-1 h-4 w-4 text-foreground" />
              Which cues in the companion session should be updated based on
              recent patterns?
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-2xl border bg-card/50 p-6">
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
        <Card className="border-rose-300 bg-rose-100/70">
          <CardContent>
            <p className="text-sm font-medium text-rose-900">{error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
