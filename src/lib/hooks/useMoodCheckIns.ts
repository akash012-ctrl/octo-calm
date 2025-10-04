"use client";

import { useState, useCallback } from "react";
import type { MoodCheckIn } from "@/types/mood";
import type { MoodCheckInFormData } from "@/lib/validation/mood-schemas";

interface UseMoodCheckInsReturn {
    checkIns: MoodCheckIn[];
    isLoading: boolean;
    error: string | null;
    submitCheckIn: (data: MoodCheckInFormData) => Promise<void>;
    fetchCheckIns: (range?: string) => Promise<void>;
    loadMore: () => Promise<void>;
    hasMore: boolean;
}

export function useMoodCheckIns(): UseMoodCheckInsReturn {
    const [checkIns, setCheckIns] = useState<MoodCheckIn[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [offset, setOffset] = useState(0);

    const submitCheckIn = useCallback(async (data: MoodCheckInFormData) => {
        try {
            setError(null);
            const response = await fetch("/api/checkins", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to submit check-in");
            }

            const result = await response.json();

            // Add new check-in to the beginning of the list
            setCheckIns((prev) => [result.checkIn, ...prev]);

            return result;
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to submit check-in";
            setError(message);
            throw err;
        }
    }, []);

    const fetchCheckIns = useCallback(async (range: string = "7days") => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await fetch(
                `/api/checkins?range=${range}&limit=50&offset=0`
            );

            if (!response.ok) {
                throw new Error("Failed to fetch check-ins");
            }

            const data = await response.json();
            setCheckIns(data.checkIns);
            setHasMore(data.hasMore);
            setOffset(data.checkIns.length);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to fetch check-ins";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadMore = useCallback(async () => {
        if (isLoading || !hasMore) return;

        try {
            setIsLoading(true);
            setError(null);

            const response = await fetch(
                `/api/checkins?limit=50&offset=${offset}`
            );

            if (!response.ok) {
                throw new Error("Failed to load more check-ins");
            }

            const data = await response.json();
            setCheckIns((prev) => [...prev, ...data.checkIns]);
            setHasMore(data.hasMore);
            setOffset((prev) => prev + data.checkIns.length);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to load more check-ins";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, hasMore, offset]);

    return {
        checkIns,
        isLoading,
        error,
        submitCheckIn,
        fetchCheckIns,
        loadMore,
        hasMore,
    };
}
