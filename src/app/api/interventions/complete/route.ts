import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/appwrite/api-auth";
import { databases, DATABASE_ID, COLLECTION_IDS } from "@/lib/appwrite/server";
import { recordInterventionAnalytics, type MoodInferenceSnapshot } from "@/lib/interventions/analytics";

interface CompleteInterventionBody {
    interventionSessionId?: string;
    durationSeconds?: number;
    helpfulnessRating?: number;
    calmnessDelta?: number;
    feedback?: string;
    sessionItemId?: string;
    realtimeSessionId?: string;
    moodInference?: unknown;
}

function ensureValid(body: CompleteInterventionBody) {
    if (!body.interventionSessionId || typeof body.interventionSessionId !== "string") {
        throw new Error("INVALID_BODY");
    }
}

function normalizeMoodInference(value: unknown): MoodInferenceSnapshot | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const payload = value as Record<string, unknown>;
    const sentiment = typeof payload.sentiment === "string" ? payload.sentiment : undefined;
    const arousal = typeof payload.arousal === "string" ? payload.arousal : undefined;
    const recommendedAction = typeof payload.recommendedAction === "string" ? payload.recommendedAction : undefined;

    const allowedSentiments = new Set(["positive", "neutral", "negative"]);
    const allowedArousal = new Set(["low", "medium", "high"]);

    return {
        sentiment: allowedSentiments.has(sentiment ?? "") ? (sentiment as MoodInferenceSnapshot["sentiment"]) : undefined,
        arousal: allowedArousal.has(arousal ?? "") ? (arousal as MoodInferenceSnapshot["arousal"]) : undefined,
        recommendedAction,
    };
}

export async function POST(request: NextRequest) {
    try {
        const userId = await requireAuth(request);
        const body: CompleteInterventionBody = await request.json().catch(() => ({}));
        ensureValid(body);

        const completedAt = new Date().toISOString();
        const payload: Record<string, unknown> = {
            completed: true,
            completedAt,
            durationSeconds: Math.max(0, Math.floor(body.durationSeconds ?? 0)),
            helpfulnessRating: body.helpfulnessRating ?? null,
            calmnessDelta: body.calmnessDelta ?? null,
            feedback: body.feedback ?? null,
            sessionItemId: body.sessionItemId ?? null,
        };

        const sessionId = body.interventionSessionId!;

        const document = await databases.updateDocument(
            DATABASE_ID,
            COLLECTION_IDS.INTERVENTION_SESSIONS,
            sessionId,
            payload
        );

        // Confirm ownership (optional hardening)
        if (document.userId !== userId) {
            // Revert to avoid leaking other user's data
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const moodInference = normalizeMoodInference(body.moodInference);
        let analytics: { moodDelta: number | null; effectivenessScore: number | null } | null = null;

        try {
            analytics = await recordInterventionAnalytics({
                userId,
                session: document,
                helpfulnessRating: typeof body.helpfulnessRating === "number" ? body.helpfulnessRating : null,
                calmnessDelta: typeof body.calmnessDelta === "number" ? body.calmnessDelta : null,
                completedAt,
                sessionItemId: (document.sessionItemId as string | null) ?? null,
                moodInference,
            });
        } catch (error) {
            console.warn("Failed to record intervention analytics", error);
        }

        if (body.realtimeSessionId) {
            const origin = request.nextUrl?.origin ?? process.env.NEXT_PUBLIC_APP_URL;
            if (origin) {
                const followUp = {
                    type: "response.create",
                    response: {
                        modalities: ["text"],
                        instructions: buildFollowUpCopy({
                            rating: body.helpfulnessRating,
                            calmnessDelta: body.calmnessDelta,
                            interventionType: document.interventionType ?? "intervention",
                        }),
                    },
                };

                fetch(new URL("/api/realtime/events", origin).toString(), {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        sessionId: body.realtimeSessionId,
                        event: followUp,
                    }),
                    credentials: "include",
                }).catch((error) => {
                    console.warn("Failed to relay intervention follow-up", error);
                });
            }
        }

        return NextResponse.json({
            interventionSessionId: sessionId,
            completedAt,
            durationSeconds: payload.durationSeconds,
            helpfulnessRating: payload.helpfulnessRating,
            calmnessDelta: payload.calmnessDelta,
            analytics,
        });
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === "Unauthorized") {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
            if (error.message === "INVALID_BODY") {
                return NextResponse.json({ error: "interventionSessionId is required" }, { status: 400 });
            }
        }

        console.error("Failed to complete intervention session", error);
        return NextResponse.json({ error: "Failed to complete intervention" }, { status: 500 });
    }
}

function buildFollowUpCopy({
    rating,
    calmnessDelta,
    interventionType,
}: {
    rating?: number;
    calmnessDelta?: number;
    interventionType: string;
}) {
    const score = typeof rating === "number" ? rating : null;
    const delta = typeof calmnessDelta === "number" ? calmnessDelta : null;
    const normalizedName = interventionType.replace(/_/g, " ");

    const ratingLine =
        score !== null
            ? score >= 4
                ? `They rated the ${normalizedName} ${score}/5. Celebrate their progress.`
                : `They rated the ${normalizedName} ${score}/5. Acknowledge the effort and ask what could help next time.`
            : `Ask the user how helpful the ${normalizedName} felt for them.`;

    const calmnessLine =
        delta !== null
            ? delta >= 0
                ? `They reported feeling ${delta} points calmer. Encourage them to notice the shift and suggest a gentle check-in later.`
                : `Calmness dropped by ${Math.abs(delta)} points. Offer empathy, explore what's still present, and invite another grounding option.`
            : "Invite them to share any shifts in their body or breath.";

    return [ratingLine, calmnessLine, "Offer to bookmark this intervention for future use and thank them for practicing together."].join(" ");
}
