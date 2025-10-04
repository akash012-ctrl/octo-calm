import { randomUUID } from "crypto";
import type { Models } from "node-appwrite";
import type {
    SessionGuardrailSnapshot,
    SessionHistoryRecord,
    SessionHistoryTranscriptItem,
} from "@/types/realtime";

export type SessionHistoryDocument = Models.Document & {
    userId: string;
    sessionId?: string;
    transcripts?: unknown[];
    recommendedInterventions?: unknown[];
    guardrails?: unknown;
    moodInferenceTimeline?: unknown[];
    durationMs?: number | null;
    startedAt?: string | null;
    endedAt?: string | null;
    transport?: "webrtc" | "websocket" | null;
    locale?: string | null;
    voice?: string | null;
    metadata?: Record<string, unknown>;
};

export function normalizeTranscripts(input: unknown): SessionHistoryTranscriptItem[] {
    if (!Array.isArray(input)) {
        return [];
    }

    const seen = new Set<string>();

    return input
        .map((item) => (typeof item === "object" && item !== null ? item : null))
        .filter((item): item is Record<string, unknown> => item !== null)
        .map((item) => {
            const speaker: SessionHistoryTranscriptItem["speaker"] =
                item.speaker === "companion" || item.speaker === "system"
                    ? item.speaker
                    : "user";

            return {
                id: typeof item.id === "string" ? item.id : randomUUID(),
                speaker,
                content: typeof item.content === "string" ? item.content : "",
                timestamp: typeof item.timestamp === "string" ? item.timestamp : new Date().toISOString(),
                confidence: typeof item.confidence === "number" ? item.confidence : undefined,
                annotations: Array.isArray(item.annotations)
                    ? item.annotations.filter((annotation): annotation is string => typeof annotation === "string")
                    : undefined,
            } satisfies SessionHistoryTranscriptItem;
        })
        .filter((item) => {
            if (!item.content) {
                return false;
            }
            if (seen.has(item.id)) {
                return false;
            }
            seen.add(item.id);
            return true;
        });
}

export function normalizeGuardrails(raw: unknown): SessionGuardrailSnapshot | null {
    if (typeof raw !== "object" || raw === null) {
        return null;
    }

    const data = raw as Record<string, unknown>;

    return {
        crisisDetected: Boolean(data.crisisDetected),
        escalationSuggested: Boolean(data.escalationSuggested),
        policyViolation: Boolean(data.policyViolation),
        ...data,
    };
}

export function mapSessionHistoryDocument(doc: SessionHistoryDocument): SessionHistoryRecord {
    const transcripts = normalizeTranscripts(doc.transcripts);

    return {
        historyId: doc.$id,
        sessionId: doc.sessionId ?? null,
        transcripts,
        totalTranscriptCount: transcripts.length,
        recommendedInterventions: Array.isArray(doc.recommendedInterventions) ? doc.recommendedInterventions : [],
        guardrails: normalizeGuardrails(doc.guardrails),
        moodInferenceTimeline: Array.isArray(doc.moodInferenceTimeline) ? doc.moodInferenceTimeline : [],
        durationMs: typeof doc.durationMs === "number" ? doc.durationMs : null,
        startedAt: doc.startedAt ?? null,
        endedAt: doc.endedAt ?? null,
        transport: doc.transport ?? null,
        locale: doc.locale ?? null,
        voice: doc.voice ?? null,
        metadata: doc.metadata ?? {},
        createdAt: doc.$createdAt,
        updatedAt: doc.$updatedAt,
    };
}
