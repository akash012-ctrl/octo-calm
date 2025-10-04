import { NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { requireAuth } from "@/lib/appwrite/api-auth";
import { databases } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTION_IDS } from "@/lib/appwrite/server";
import { recommendInterventionsFromMood } from "@/lib/ai/intervention-recommender";
import { createRealtimeClientSecret, generateServerSessionId } from "@/lib/ai/realtimeClient";
import { buildRealtimeInstructions } from "@/lib/ai/sessionPrompts";
import type { MoodCheckIn } from "@/types/mood";

interface SessionRequestBody {
    transport?: "webrtc" | "websocket";
    locale?: string;
    voice?: string;
}

export async function POST(request: NextRequest) {
    try {
        const userId = await requireAuth(request);
        const body: SessionRequestBody = await request.json().catch(() => ({}));

        const transport = body.transport === "websocket" ? "websocket" : "webrtc";
        const locale = body.locale ?? "en-US";
        const voice = body.voice ?? "alloy";

        const checkInsResponse = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_IDS.MOOD_CHECKINS,
            [
                Query.equal("userId", userId),
                Query.orderDesc("timestamp"),
                Query.limit(10),
            ]
        );

        const moodHistory = checkInsResponse.documents.map((doc) => doc as unknown as MoodCheckIn);
        const recommendedInterventions = recommendInterventionsFromMood(moodHistory);

        const instructions = await buildRealtimeInstructions(locale, moodHistory);

        const { clientSecret } = await createRealtimeClientSecret({
            voice,
            instructions,
            transport,
            modalities: ["text", "audio"],
        });

        const sessionId = generateServerSessionId();

        return NextResponse.json({
            sessionId,
            clientSecret,
            transport,
            locale,
            voice,
            connectionState: "connecting",
            recommendedInterventions,
            guardrails: {
                crisisDetected: false,
                escalationSuggested: false,
                policyViolation: false,
            },
            moodContext: moodHistory.map((entry) => ({
                id: entry.$id,
                speaker: "user",
                content: entry.notes || `Mood ${entry.mood} with intensity ${entry.intensity}`,
                timestamp: entry.timestamp,
                annotations: entry.triggers ?? [],
            })),
        });
    } catch (error) {
        console.error("Failed to bootstrap realtime session:", error);

        if (error instanceof Error && error.message === "Unauthorized") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        return NextResponse.json({ error: "Failed to bootstrap session" }, { status: 500 });
    }
}

