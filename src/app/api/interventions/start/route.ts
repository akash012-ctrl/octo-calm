import { NextRequest, NextResponse } from "next/server";
import { ID } from "node-appwrite";
import { requireAuth } from "@/lib/appwrite/api-auth";
import { databases, DATABASE_ID, COLLECTION_IDS } from "@/lib/appwrite/server";

interface StartInterventionBody {
    interventionType?: string;
    realtimeSessionId?: string;
    sessionItemId?: string;
    triggerMoodId?: string;
    notes?: string;
    context?: Record<string, unknown>;
}

function validateBody(body: StartInterventionBody) {
    if (!body.interventionType || typeof body.interventionType !== "string") {
        throw new Error("INVALID_BODY");
    }
}

export async function POST(request: NextRequest) {
    try {
        const userId = await requireAuth(request);
        const body: StartInterventionBody = await request.json().catch(() => ({}));
        validateBody(body);

        const startedAt = new Date().toISOString();
        const document = await databases.createDocument(
            DATABASE_ID,
            COLLECTION_IDS.INTERVENTION_SESSIONS,
            ID.unique(),
            {
                userId,
                interventionType: body.interventionType,
                realtimeSessionId: body.realtimeSessionId ?? null,
                sessionItemId: body.sessionItemId ?? null,
                triggerMoodId: body.triggerMoodId ?? null,
                notes: body.notes ?? null,
                context: body.context ?? {},
                completed: false,
                durationSeconds: 0,
                startedAt,
                completedAt: null,
                helpfulnessRating: null,
                calmnessDelta: null,
            }
        );

        return NextResponse.json({
            interventionSessionId: document.$id,
            startedAt,
            interventionType: body.interventionType,
            realtimeSessionId: body.realtimeSessionId ?? null,
        });
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === "Unauthorized") {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
            if (error.message === "INVALID_BODY") {
                return NextResponse.json({ error: "interventionType is required" }, { status: 400 });
            }
        }

        console.error("Failed to start intervention session", error);
        return NextResponse.json({ error: "Failed to start intervention" }, { status: 500 });
    }
}
