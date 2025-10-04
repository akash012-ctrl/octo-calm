"use client";

import { useAuth } from "@/lib/context/AuthContext";
import { signOut } from "@/lib/appwrite/auth-new";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  MoodHistory,
  MoodChart,
} from "@/components/features/mood-tracker";
import { useMoodCheckIns } from "@/lib/hooks/useMoodCheckIns";
import { format, isToday } from "date-fns";
import { Heart, TrendingUp } from "lucide-react";
import { MoodCheckInFormData } from "@/lib/validation/mood-schemas";

export default function DashboardPage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const {
    checkIns,
    isLoading: checkInsLoading,
    error,
    submitCheckIn,
    fetchCheckIns,
    loadMore,
    hasMore,
  } = useMoodCheckIns();

  const [showCheckInForm, setShowCheckInForm] = useState(false);

  // Fetch check-ins on mount
  useEffect(() => {
    if (user) {
      fetchCheckIns("30days");
    }
  }, [user, fetchCheckIns]);

  // Redirect to login when not authenticated
  useEffect(() => {
    if (!loading && !user) {
      console.log("[Dashboard] No authenticated user, redirecting to /login");
      router.replace("/login");
    }
  }, [loading, user, router]);

  // Check if user has completed check-in today
  const hasCheckedInToday = checkIns.some((checkIn) =>
    isToday(new Date(checkIn.timestamp))
  );

  const lastCheckIn = checkIns[0];

  const handleSignOut = async () => {
    try {
      console.log("[Dashboard] Signing out...");
      await signOut();
      await refreshUser();
      console.log("[Dashboard] Redirecting to /login");
      router.replace("/login");
    } catch (error) {
      console.error("[Dashboard] Error signing out:", error);
    }
  };

  const handleCheckInSubmit = async (data: MoodCheckInFormData) => {
    await submitCheckIn(data);
    setShowCheckInForm(false);
  };

  if (loading || (!loading && !user)) {
    return <AuthLoading />;
  }

  const currentUser = user as NonNullable<typeof user>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-7xl mx-auto space-y-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Welcome back, {currentUser.name}!
            </h1>
            <p className="text-muted-foreground mt-1">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          <Button onClick={handleSignOut} variant="outline">
            Sign Out
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Today&apos;s Check-In
              </CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {hasCheckedInToday ? "✓ Completed" : "Not yet"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {hasCheckedInToday
                  ? "Great job tracking your mood!"
                  : "Take a moment to check in"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Check-Ins
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{checkIns.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Last Check-In
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lastCheckIn ? (
                <>
                  <div className="text-2xl font-bold">
                    {["😢", "😔", "😐", "🙂", "😊"][lastCheckIn.mood - 1]}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(
                      new Date(lastCheckIn.timestamp),
                      "MMM d 'at' h:mm a"
                    )}
                  </p>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No check-ins yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Mood Check-In Section */}
        {!hasCheckedInToday && !showCheckInForm && (
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle>Daily Check-In</CardTitle>
              <CardDescription>
                You haven&apos;t checked in today. How are you feeling?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowCheckInForm(true)} size="lg">
                Start Check-In
              </Button>
            </CardContent>
          </Card>
        )}

        {showCheckInForm && (
          <div className="flex justify-center">
            <MoodCheckInForm
              onSubmit={handleCheckInSubmit}
              className="max-w-2xl w-full"
            />
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mood Chart */}
          <div className="lg:col-span-2">
            <MoodChart checkIns={checkIns} />
          </div>

          {/* Recent Check-Ins */}
          <div className="lg:col-span-2">
            <MoodHistory
              checkIns={checkIns}
              onLoadMore={loadMore}
              hasMore={hasMore}
              isLoading={checkInsLoading}
            />
          </div>
        </div>

        {error && (
          <Card className="border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-800">
            <CardContent className="pt-6">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
