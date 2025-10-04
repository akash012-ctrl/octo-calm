import { ID, Permission, Query, Role } from "node-appwrite";
import { databases, DATABASE_ID, COLLECTION_IDS } from "@/lib/appwrite/server";
import { scoreEffectiveness } from "@/lib/ai/mood-inference";
import type { InterventionType } from "@/types/intervention";

interface MoodCheckInDoc {
    mood?: number;
    timestamp?: string;
}

interface InterventionSessionDoc {
    $id: string;
    interventionType?: string;
    sessionItemId?: string | null;
    startedAt?: string | null;
}

export interface MoodInferenceSnapshot {
    sentiment?: "positive" | "neutral" | "negative";
    arousal?: "low" | "medium" | "high";
    recommendedAction?: string;
}

export interface RecordAnalyticsParams {
    userId: string;
    session: InterventionSessionDoc;
    helpfulnessRating: number | null;
    calmnessDelta: number | null;
    completedAt: string;
    sessionItemId: string | null;
    moodInference?: MoodInferenceSnapshot | null;
}

const INTERVENTION_TYPES: InterventionType[] = [
    "breathing",
    "meditation",
    "journaling",
    "physical-activity",
    "grounding",
    "cognitive-reframing",
    "distraction",
    "social-support",
];

function coerceInterventionType(value: unknown): InterventionType {
    const candidate = typeof value === "string" ? (value as InterventionType) : null;
    if (candidate && INTERVENTION_TYPES.includes(candidate)) {
        return candidate;
    }
    return "grounding";
}

function toDate(value: string | null | undefined): Date | null {
    if (!value) {
        return null;
    }
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? null : new Date(ms);
}

function pickClosestMoodEntries(docs: MoodCheckInDoc[], startedAt: Date | null, completedAt: Date): number | null {
    const sorted = docs
        .filter((doc) => typeof doc.timestamp === "string")
        .sort((a, b) => Date.parse(a.timestamp ?? "") - Date.parse(b.timestamp ?? ""));

    const startMs = startedAt?.getTime() ?? completedAt.getTime();
    const endMs = completedAt.getTime();

    const preMood = findMoodBefore(sorted, startMs);
    const postMood = findMoodAfter(sorted, endMs);

    return preMood !== null && postMood !== null ? postMood - preMood : null;
}

function sentimentToScore(sentiment?: string): number | null {
    if (sentiment === "positive") return 1;
    if (sentiment === "negative") return -1;
    if (sentiment === "neutral") return 0;
    return null;
}

function toNumberOrNull(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function findMoodBefore(docs: MoodCheckInDoc[], targetMs: number): number | null {
    for (let i = docs.length - 1; i >= 0; i -= 1) {
        const entry = docs[i];
        if (typeof entry.mood !== "number") continue;
        const timestampMs = Date.parse(entry.timestamp ?? "");
        if (!Number.isNaN(timestampMs) && timestampMs <= targetMs) {
            return entry.mood;
        }
    }
    return null;
}

function findMoodAfter(docs: MoodCheckInDoc[], targetMs: number): number | null {
    for (const entry of docs) {
        if (typeof entry.mood !== "number") continue;
        const timestampMs = Date.parse(entry.timestamp ?? "");
        if (!Number.isNaN(timestampMs) && timestampMs >= targetMs) {
            return entry.mood;
        }
    }
    return null;
}

function computeEffectiveness(
    rating: number | null,
    calmnessDelta: number | null,
    moodDelta: number | null
): number | null {
    const normalizedRating = rating ?? null;
    const normalizedCalmness = calmnessDelta ?? null;
    return scoreEffectiveness(normalizedRating, normalizedCalmness, moodDelta ?? 0);
}

function buildAnalyticsPayload(options: {
    userId: string;
    session: InterventionSessionDoc;
    completedAt: string;
    calmnessDelta: number | null;
    helpfulnessRating: number | null;
    moodDelta: number | null;
    sentimentScore: number | null;
    moodInference?: MoodInferenceSnapshot | null;
    sessionItemId: string | null;
    effectivenessScore: number | null;
}) {
    return {
        userId: options.userId,
        interventionSessionId: options.session.$id,
        interventionType: coerceInterventionType(options.session.interventionType),
        completedAt: options.completedAt,
        calmnessDelta: options.calmnessDelta,
        helpfulnessRating: options.helpfulnessRating,
        moodDelta: options.moodDelta,
        sentimentScore: options.sentimentScore,
        arousalLevel: options.moodInference?.arousal ?? null,
        recommendedAction: options.moodInference?.recommendedAction ?? null,
        sessionItemId: options.sessionItemId,
        effectivenessScore: options.effectivenessScore,
    };
}

export async function recordInterventionAnalytics(params: RecordAnalyticsParams): Promise<{ moodDelta: number | null; effectivenessScore: number | null }> {
    const { userId, session, completedAt, helpfulnessRating, calmnessDelta, sessionItemId, moodInference } = params;
    const completedAtDate = toDate(completedAt);
    if (!completedAtDate) {
        throw new Error("INVALID_COMPLETION_TIMESTAMP");
    }

    const startedAtDate = toDate(session.startedAt ?? null);

    const windowStart = new Date((startedAtDate ?? completedAtDate).getTime() - 1000 * 60 * 90).toISOString();
    const windowEnd = new Date(completedAtDate.getTime() + 1000 * 60 * 30).toISOString();

    const checkIns = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_IDS.MOOD_CHECKINS,
        [
            Query.equal("userId", userId),
            Query.orderAsc("timestamp"),
            Query.limit(20),
            Query.greaterThanEqual("timestamp", windowStart),
            Query.lessThanEqual("timestamp", windowEnd),
        ]
    );

    const moodDelta = pickClosestMoodEntries(checkIns.documents as MoodCheckInDoc[], startedAtDate, completedAtDate);
    const effectiveRating = toNumberOrNull(helpfulnessRating);
    const effectiveCalmness = toNumberOrNull(calmnessDelta);
    const effectivenessScore = computeEffectiveness(effectiveRating, effectiveCalmness, moodDelta);
    const sentimentScore = sentimentToScore(moodInference?.sentiment ?? undefined);

    const payload = buildAnalyticsPayload({
        userId,
        session,
        completedAt,
        calmnessDelta: effectiveCalmness,
        helpfulnessRating: effectiveRating,
        moodDelta,
        sentimentScore,
        moodInference,
        sessionItemId,
        effectivenessScore,
    });

    await databases.createDocument(
        DATABASE_ID,
        COLLECTION_IDS.INTERVENTION_ANALYTICS,
        ID.unique(),
        payload,
        [
            Permission.read(Role.user(userId)),
            Permission.update(Role.user(userId)),
            Permission.delete(Role.user(userId)),
            Permission.write(Role.user(userId)),
        ]
    );

    return { moodDelta, effectivenessScore };
}
