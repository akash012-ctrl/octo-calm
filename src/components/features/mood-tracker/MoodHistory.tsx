"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  PlayCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { MoodCheckIn } from "@/types/mood";
import { cn } from "@/lib/utils";

interface MoodHistoryProps {
  checkIns: MoodCheckIn[];
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  className?: string;
}

const MOOD_EMOJIS = {
  1: "😢",
  2: "😔",
  3: "😐",
  4: "🙂",
  5: "😊",
} as const;

const MOOD_LABELS = {
  1: "Very Low",
  2: "Low",
  3: "Neutral",
  4: "Good",
  5: "Great",
} as const;

export function MoodHistory({
  checkIns,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  className,
}: MoodHistoryProps) {
  const [playingAudio, setPlayingAudio] = React.useState<string | null>(null);

  const handlePlayAudio = (checkInId: string) => {
    // TODO: Implement audio playback in Phase 2.2
    setPlayingAudio(checkInId);
    setTimeout(() => setPlayingAudio(null), 2000);
  };

  const getTrendIcon = (current: number, previous?: number) => {
    if (!previous) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (current > previous)
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (current < previous)
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  if (checkIns.length === 0) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle>Check-In History</CardTitle>
          <CardDescription>
            Your past mood check-ins will appear here
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground mb-2">
            No check-ins yet
          </p>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Complete your first mood check-in to start tracking your emotional
            journey
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>Check-In History</CardTitle>
        <CardDescription>
          {checkIns.length} {checkIns.length === 1 ? "entry" : "entries"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {checkIns.map((checkIn, index) => {
          const previousCheckIn = checkIns[index + 1];
          const hasAudio =
            !!checkIn.audioSummaryId || !!checkIn.transcriptReference;

          return (
            <div
              key={checkIn.$id}
              className={cn(
                "p-4 rounded-lg border bg-card transition-all hover:shadow-md",
                checkIn.crisisDetected &&
                  "border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-800"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Mood Display */}
                <div className="flex items-center gap-3">
                  <div className="text-4xl">{MOOD_EMOJIS[checkIn.mood]}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">
                        {MOOD_LABELS[checkIn.mood]}
                      </h3>
                      {getTrendIcon(checkIn.mood, previousCheckIn?.mood)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(
                        new Date(checkIn.timestamp),
                        "MMM d, yyyy 'at' h:mm a"
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Intensity: {checkIn.intensity}/10
                    </p>
                  </div>
                </div>

                {/* Audio Playback Button */}
                {hasAudio && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePlayAudio(checkIn.$id)}
                    disabled={playingAudio === checkIn.$id}
                    className="shrink-0"
                  >
                    <PlayCircle
                      className={cn(
                        "h-4 w-4",
                        playingAudio === checkIn.$id && "animate-pulse"
                      )}
                    />
                  </Button>
                )}
              </div>

              {/* Triggers */}
              {checkIn.triggers && checkIn.triggers.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {checkIn.triggers.map((trigger) => (
                    <span
                      key={trigger}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground"
                    >
                      {trigger}
                    </span>
                  ))}
                </div>
              )}

              {/* Notes */}
              {checkIn.notes && (
                <p className="mt-3 text-sm text-muted-foreground italic">
                  &quot;{checkIn.notes}&quot;
                </p>
              )}

              {/* Crisis Badge */}
              {checkIn.crisisDetected && (
                <div className="mt-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 font-medium">
                  <span className="inline-block w-2 h-2 bg-red-500 rounded-full" />
                  Elevated concern detected
                </div>
              )}
            </div>
          );
        })}

        {/* Load More Button */}
        {hasMore && (
          <Button
            variant="outline"
            className="w-full"
            onClick={onLoadMore}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Load More"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
