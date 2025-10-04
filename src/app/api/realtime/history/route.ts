import { NextRequest, NextResponse } from "next/server";
import { ID } from "node-appwrite";
import { requireAuth } from "@/lib/appwrite/api-auth";
import { databases, DATABASE_ID, COLLECTION_IDS } from "@/lib/appwrite/server";

interface SessionHistoryBody {
    sessionId?: string;
    transcripts?: unknown[];
    recommendedInterventions?: unknown[];
    guardrails?: unknown;
    moodInferenceTimeline?: unknown[];
    durationMs?: number;
    startedAt?: string;
    endedAt?: string;
    transport?: "webrtc" | "websocket";
    locale?: string;
    voice?: string;
    metadata?: Record<string, unknown>;
}

function assertString(value: unknown, code: string) {
    if (typeof value !== "string" || value.length === 0) {
        throw new Error(code);
    }
}

function assertArray(value: unknown, code: string) {
    if (!Array.isArray(value)) {
        throw new Error(code);
    }
}

function assertOptionalNumber(value: unknown, code: string) {
    if (value !== undefined && typeof value !== "number") {
        throw new Error(code);
    }
}

function validateBody(body: SessionHistoryBody) {
    assertString(body.sessionId, "INVALID_SESSION_ID");
    assertArray(body.transcripts, "INVALID_TRANSCRIPTS");
    assertOptionalNumber(body.durationMs, "INVALID_DURATION");
}

export async function POST(request: NextRequest) {
    try {
        const userId = await requireAuth(request);
        const body: SessionHistoryBody = await request.json().catch(() => ({}));
        validateBody(body);

        const doc = await databases.createDocument(
            DATABASE_ID,
            COLLECTION_IDS.SESSION_HISTORY,
            ID.unique(),
            {
                userId,
                sessionId: body.sessionId,
                transcripts: body.transcripts,
                recommendedInterventions: body.recommendedInterventions ?? [],
                guardrails: body.guardrails ?? null,
                moodInferenceTimeline: body.moodInferenceTimeline ?? [],
                durationMs: body.durationMs ?? null,
                startedAt: body.startedAt ?? null,
                endedAt: body.endedAt ?? new Date().toISOString(),
                transport: body.transport ?? null,
                locale: body.locale ?? null,
                voice: body.voice ?? null,
                metadata: body.metadata ?? {},
            }
        );

        return NextResponse.json({
            historyId: doc.$id,
            sessionId: doc.sessionId,
            storedAt: doc.$createdAt,
        });
    } catch (error) {
        if (error instanceof Error) {
            switch (error.message) {
                case "Unauthorized":
                    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
                case "INVALID_SESSION_ID":
                    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
                case "INVALID_TRANSCRIPTS":
                    return NextResponse.json({ error: "transcripts must be an array" }, { status: 400 });
                case "INVALID_DURATION":
                    return NextResponse.json({ error: "durationMs must be a number" }, { status: 400 });
                default:
                    break;
            }
        }

        console.error("Failed to persist realtime history", error);
        return NextResponse.json({ error: "Failed to persist history" }, { status: 500 });
    }
}
