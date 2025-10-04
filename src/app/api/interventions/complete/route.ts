import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/appwrite/api-auth";
import { databases, DATABASE_ID, COLLECTION_IDS } from "@/lib/appwrite/server";

interface CompleteInterventionBody {
    interventionSessionId?: string;
    durationSeconds?: number;
    helpfulnessRating?: number;
    calmnessDelta?: number;
    feedback?: string;
    sessionItemId?: string;
    transcriptSnapshot?: unknown;
}

function ensureValid(body: CompleteInterventionBody) {
    if (!body.interventionSessionId || typeof body.interventionSessionId !== "string") {
        throw new Error("INVALID_BODY");
    }
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
            transcriptSnapshot: body.transcriptSnapshot ?? null,
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

        return NextResponse.json({
            interventionSessionId: sessionId,
            completedAt,
            durationSeconds: payload.durationSeconds,
            helpfulnessRating: payload.helpfulnessRating,
            calmnessDelta: payload.calmnessDelta,
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
