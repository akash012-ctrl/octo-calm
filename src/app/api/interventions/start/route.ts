import { NextRequest, NextResponse } from "next/server";
import { ID, Permission, Role } from "node-appwrite";
import { requireAuth } from "@/lib/appwrite/api-auth";
import { databases, DATABASE_ID, COLLECTION_IDS } from "@/lib/appwrite/server";
import { INTERVENTION_TYPE_VALUES } from "@/types/intervention";

const INTERVENTION_TYPE_MAP: Record<string, string> = {
    grounding_60s: "grounding",
    box_breathing_90s: "breathing",
};

const VALID_INTERVENTION_TYPES = new Set<string>([
    ...INTERVENTION_TYPE_VALUES,
    ...Object.keys(INTERVENTION_TYPE_MAP),
]);

const ALLOWED_INTERVENTION_ENUMS = new Set<string>(INTERVENTION_TYPE_VALUES);

function resolveInterventionType(interventionType: string) {
    const normalized = INTERVENTION_TYPE_MAP[interventionType] ?? interventionType;

    if (!VALID_INTERVENTION_TYPES.has(interventionType)) {
        throw new Error("INVALID_INTERVENTION_TYPE");
    }

    if (!ALLOWED_INTERVENTION_ENUMS.has(normalized)) {
        throw new Error("INVALID_INTERVENTION_TYPE");
    }

    return {
        interventionKey: interventionType,
        storedInterventionType: normalized,
    } as const;
}

interface StartInterventionBody {
    interventionType?: string;
    realtimeSessionId?: string;
    sessionItemId?: string;
    triggerMoodId?: string;
    notes?: string;
    context?: unknown;
}

function validateBody(body: StartInterventionBody) {
    if (!body.interventionType || typeof body.interventionType !== "string") {
        throw new Error("INVALID_BODY");
    }

    if (!VALID_INTERVENTION_TYPES.has(body.interventionType)) {
        throw new Error("INVALID_INTERVENTION_TYPE");
    }
}

function serializeContext(context: unknown): string | null {
    if (context === undefined || context === null) {
        return null;
    }

    if (typeof context === "string") {
        return context.length > 4000 ? `${context.slice(0, 3997)}...` : context;
    }

    try {
        const serialized = JSON.stringify(context);
        return serialized.length > 4000
            ? `${serialized.slice(0, 3997)}...`
            : serialized;
    } catch {
        throw new Error("INVALID_CONTEXT");
    }
}

const AGENT_INSTRUCTIONS: Record<string, string> = {
    grounding_60s:
        "Guide the user through the 5-4-3-2-1 grounding exercise. Mirror their observations, keep pace with their selections, and celebrate completion with a calm tone.",
    box_breathing_90s:
        "Lead a 4-4-4-4 box breathing sequence for approximately 90 seconds. Count each segment with the user, invite gentle posture adjustments, and close with a body check-in.",
};

function buildAgentInstructions(interventionType: string) {
    return (
        AGENT_INSTRUCTIONS[interventionType] ??
        `Guide the user through the ${interventionType.replace(/_/g, " ")} intervention with compassionate pacing and realtime check-ins.`
    );
}

export async function POST(request: NextRequest) {
    try {
        const userId = await requireAuth(request);
        const body: StartInterventionBody = await request.json().catch(() => ({}));
        validateBody(body);

        const startedAt = new Date().toISOString();
        const agentInstructions = buildAgentInstructions(body.interventionType!);
        const { interventionKey, storedInterventionType } = resolveInterventionType(body.interventionType!);
        const serializedContext = serializeContext(body.context);

        const document = await databases.createDocument(
            DATABASE_ID,
            COLLECTION_IDS.INTERVENTION_SESSIONS,
            ID.unique(),
            {
                userId,
                interventionType: storedInterventionType,
                interventionKey,
                realtimeSessionId: body.realtimeSessionId ?? null,
                sessionItemId: body.sessionItemId ?? null,
                triggerMoodId: body.triggerMoodId ?? null,
                notes: body.notes ?? null,
                context: serializedContext,
                completed: false,
                durationSeconds: 0,
                startedAt,
                completedAt: null,
                helpfulnessRating: null,
                calmnessDelta: null,
                agentInstructions,
            }
            ,
            [
                Permission.read(Role.user(userId)),
                Permission.update(Role.user(userId)),
                Permission.delete(Role.user(userId)),
                Permission.write(Role.user(userId)),
            ]
        );

        return NextResponse.json({
            interventionSessionId: document.$id,
            startedAt,
            interventionType: interventionKey,
            storedInterventionType,
            realtimeSessionId: body.realtimeSessionId ?? null,
            agentInstructions,
        });
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === "Unauthorized") {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
            if (error.message === "INVALID_BODY") {
                return NextResponse.json({ error: "interventionType is required" }, { status: 400 });
            }
            if (error.message === "INVALID_INTERVENTION_TYPE") {
                return NextResponse.json({ error: "Unsupported interventionType" }, { status: 400 });
            }
            if (error.message === "INVALID_CONTEXT") {
                return NextResponse.json({ error: "Could not serialize context payload" }, { status: 400 });
            }
        }

        console.error("Failed to start intervention session", error);
        return NextResponse.json({ error: "Failed to start intervention" }, { status: 500 });
    }
}
