import { NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { requireAuth } from "@/lib/appwrite/api-auth";
import { databases } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTION_IDS } from "@/lib/appwrite/server";
import { recommendInterventions } from "@/lib/ai/intervention-recommender";
import { buildRealtimeSessionConfig, createRealtimeClientSecret, generateServerSessionId } from "@/lib/ai/realtimeClient";
import { buildRealtimeInstructions } from "@/lib/ai/sessionPrompts";
import type { MoodCheckIn } from "@/types/mood";
import type { UserPreferences } from "@/types/user";

interface SessionRequestBody {
    transport?: "webrtc" | "websocket";
    locale?: string;
    voice?: string;
}

interface BootstrapContext {
    userId: string;
    transport: "webrtc" | "websocket";
    locale: string;
    voice: string;
}

async function loadRecentMoodHistory(userId: string): Promise<MoodCheckIn[]> {
    const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_IDS.MOOD_CHECKINS,
        [
            Query.equal("userId", userId),
            Query.orderDesc("timestamp"),
            Query.limit(10),
        ]
    );

    return response.documents.map((doc) => doc as unknown as MoodCheckIn);
}

async function loadUserPreferences(userId: string): Promise<UserPreferences | null> {
    const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_IDS.USER_PREFERENCES,
        [
            Query.equal("userId", userId),
            Query.limit(1),
        ]
    );

    return (response.documents[0] as unknown as UserPreferences | undefined) ?? null;
}

async function assembleSessionBootstrap(context: BootstrapContext) {
    const { userId, transport, locale, voice } = context;

    const moodHistory = await loadRecentMoodHistory(userId);
    const recommendedInterventions = recommendInterventions(null, { checkIns: moodHistory });
    const userPreferences = await loadUserPreferences(userId);

    const instructionBundle = await buildRealtimeInstructions({
        locale,
        transport,
        voice,
        moodHistory,
        preferences: userPreferences,
    });

    const outputModalities: ("text" | "audio")[] = transport === "websocket" ? ["text"] : ["audio", "text"];
    const sessionConfig = buildRealtimeSessionConfig({
        instructions: instructionBundle.instructions,
        voice,
        transport,
        model: process.env.OPENAI_REALTIME_MODEL,
        preferences: userPreferences,
        personaVersion: instructionBundle.personaVersion,
        guardrailDirectives: instructionBundle.guardrailDirectives,
        preferenceSummary: instructionBundle.preferenceSummary,
        moodDigest: instructionBundle.personalizationSummary,
        locale,
        modalities: outputModalities,
    });

    const { clientSecret } = await createRealtimeClientSecret({
        voice,
        instructions: instructionBundle.instructions,
        transport,
        modalities: outputModalities,
        model: sessionConfig.model,
        sessionConfig,
    });

    return {
        sessionId: generateServerSessionId(),
        clientSecret,
        transport,
        locale,
        voice,
        connectionState: "connecting" as const,
        recommendedInterventions,
        guardrails: {
            crisisDetected: false,
            escalationSuggested: false,
            policyViolation: false,
        },
        moodContext: moodHistory.map((entry) => ({
            id: entry.$id,
            speaker: "user" as const,
            content: entry.notes || `Mood ${entry.mood} with intensity ${entry.intensity}`,
            timestamp: entry.timestamp,
            annotations: entry.triggers ?? [],
        })),
        checkIns: moodHistory,
        instructionMeta: {
            personaVersion: instructionBundle.personaVersion,
            sections: instructionBundle.sections,
            guardrailDirectives: instructionBundle.guardrailDirectives,
            preferenceSummary: instructionBundle.preferenceSummary,
            personalizationSummary: instructionBundle.personalizationSummary,
        },
        sessionConfig,
    };
}

export async function POST(request: NextRequest) {
    try {
        const userId = await requireAuth(request);
        const body: SessionRequestBody = await request.json().catch(() => ({}));

        const transport = body.transport === "websocket" ? "websocket" : "webrtc";
        const locale = body.locale ?? "en-US";
        const voice = body.voice ?? "alloy";

        const payload = await assembleSessionBootstrap({ userId, transport, locale, voice });

        return NextResponse.json(payload);
    } catch (error) {
        console.error("Failed to bootstrap realtime session:", error);

        if (error instanceof Error && error.message === "Unauthorized") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        return NextResponse.json({ error: "Failed to bootstrap session" }, { status: 500 });
    }
}

