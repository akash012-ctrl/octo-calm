"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowRight,
  Compass,
  Headphones,
  Mic,
  NotebookPen,
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
import { useRealtimeSessionStore } from "@/lib/stores/realtimeSessionStore";
import type { SessionHistoryRecord } from "@/types/realtime";

export default function DashboardPage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const exportPersistedHistory = useRealtimeSessionStore(
    (state) => state.exportPersistedHistory
  );
  const historyCount = useRealtimeSessionStore(
    (state) => state.historyTotalCount
  );
  const [recentSummary, setRecentSummary] = useState<Pick<
    SessionHistoryRecord,
    "summary" | "updatedAt" | "historyId"
  > | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setSummaryLoading(true);
    setSummaryError(null);

    exportPersistedHistory()
      .then((record) => {
        if (!record) {
          setRecentSummary(null);
          return;
        }

        setRecentSummary({
          summary: record.summary,
          updatedAt: record.updatedAt,
          historyId: record.historyId,
        });
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to load your last summary";
        setSummaryError(message);
      })
      .finally(() => setSummaryLoading(false));
  }, [user, exportPersistedHistory]);

  const isAuthLoading = loading || !user;

  const summaryTimestamp = useMemo(() => {
    if (!recentSummary?.updatedAt) return null;
    return formatDistanceToNow(new Date(recentSummary.updatedAt), {
      addSuffix: true,
    });
  }, [recentSummary]);

  const summaryPreview = useMemo(() => {
    if (!recentSummary?.summary) return null;
    return recentSummary.summary.length > 600
      ? `${recentSummary.summary.slice(0, 600)}…`
      : recentSummary.summary;
  }, [recentSummary]);

  if (isAuthLoading) {
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
              Clinician-guided voice support
            </span>
            <span className="text-xs sm:text-sm">
              Start a live conversation or review the latest summary below.
            </span>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3 sm:mt-0 sm:justify-end">
          <Link href="/onboarding">
            <Button variant="outline" className="w-full sm:w-auto">
              <ArrowRight className="mr-2 h-4 w-4" /> Get oriented
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

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border border-primary/20 bg-card/95 shadow-primary-glow">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Headphones className="h-5 w-5 text-primary" /> Start a voice
                session
              </CardTitle>
              <CardDescription>
                The companion mirrors a veteran psychiatrist with a steady,
                calming cadence.
              </CardDescription>
            </div>
            <Link href="/dashboard/companion">
              <Button>Launch companion</Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Pick a single theme—sleep patterns, a difficult interaction, or a
              stubborn worry—and speak naturally. The agent will prompt for
              clarity, summarize the important points, and make sure you leave
              with a grounded next step.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                Push-to-talk keeps your microphone muted until you hold the
                button.
              </div>
              <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                Captions stay on your device and refresh in real time.
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-card/95 shadow-primary-glow">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <NotebookPen className="h-5 w-5 text-primary" /> Latest summary
            </CardTitle>
            <CardDescription>
              {summaryLoading
                ? "Fetching your notes…"
                : recentSummary
                ? summaryTimestamp
                  ? `Updated ${summaryTimestamp}`
                  : "Recently saved"
                : "No saved sessions yet"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {summaryError && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                {summaryError}
              </p>
            )}
            {summaryPreview ? (
              <p className="whitespace-pre-wrap text-sm text-foreground">
                {summaryPreview}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Summaries appear after you wrap a session and tap “Save
                summary.” They capture risk checks, supportive interventions,
                and the agreed next step.
              </p>
            )}
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {historyCount
                ? `${historyCount} transcript turn${
                    historyCount === 1 ? "" : "s"
                  } in last saved session`
                : "No transcripts saved yet"}
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="border bg-card/95 shadow-primary-glow">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-primary" /> Quick prep
            </CardTitle>
            <CardDescription className="text-sm">
              Give the companion a clean signal and clear intention.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <ol className="space-y-2">
              <li>1. Pop on headphones and confirm the correct microphone.</li>
              <li>
                2. Take two slow breaths before tapping “Start companion
                session.”
              </li>
              <li>
                3. Keep sentences conversational—the agent handles pauses and
                restarts.
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card className="border bg-card/95 shadow-primary-glow">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-primary" /> After the call
            </CardTitle>
            <CardDescription className="text-sm">
              Close the loop while the insights are fresh.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <ul className="space-y-2">
              <li>• Generate a clinical note in one click.</li>
              <li>
                • Save the summary or download a JSON copy for your records.
              </li>
              <li>
                • Revisit the guide for escalation steps if new safety concerns
                emerge.
              </li>
            </ul>
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
    </div>
  );
}
