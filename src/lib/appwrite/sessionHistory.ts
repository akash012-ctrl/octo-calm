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
    transcripts?: unknown[] | string;
    guardrails?: unknown | string;
    durationMs?: number | null;
    startedAt?: string | null;
    endedAt?: string | null;
    transport?: "webrtc" | "websocket" | null;
    locale?: string | null;
    voice?: string | null;
    metadata?: Record<string, unknown> | string;
};

function parseJsonArray(raw: unknown): unknown[] {
    if (Array.isArray(raw)) {
        return raw;
    }

    if (typeof raw !== "string" || raw.length === 0) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn("Failed to parse JSON array", error);
        return [];
    }
}

function coerceTranscriptSource(input: unknown): unknown[] {
    if (typeof input === "string") {
        return parseJsonArray(input);
    }

    return Array.isArray(input) ? input : [];
}

function parseMetadata(raw: unknown): Record<string, unknown> {
    if (typeof raw === "string") {
        if (!raw.length) {
            return {};
        }
        try {
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
        } catch (error) {
            console.warn("Failed to parse session metadata", error);
            return {};
        }
    }

    if (raw && typeof raw === "object") {
        return { ...(raw as Record<string, unknown>) };
    }

    return {};
}

export function normalizeTranscripts(input: unknown): SessionHistoryTranscriptItem[] {
    const source = coerceTranscriptSource(input);

    if (source.length === 0) {
        return [];
    }

    const seen = new Set<string>();

    return source
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
    if (typeof raw === "string") {
        try {
            return normalizeGuardrails(JSON.parse(raw) as unknown);
        } catch (error) {
            console.warn("Failed to parse guardrail snapshot", error);
            return null;
        }
    }

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
    const metadataRaw = parseMetadata(doc.metadata);
    const summary = typeof metadataRaw.summary === "string" ? metadataRaw.summary : null;
    if (summary && "summary" in metadataRaw) {
        delete metadataRaw.summary;
    }
    const guardrailSource = metadataRaw.guardrails ?? doc.guardrails ?? null;
    if (guardrailSource && typeof metadataRaw.guardrails !== "undefined") {
        delete metadataRaw.guardrails;
    }

    return {
        historyId: doc.$id,
        sessionId: doc.sessionId ?? null,
        transcripts,
        totalTranscriptCount: transcripts.length,
        summary,
        guardrails: normalizeGuardrails(guardrailSource),
        durationMs: typeof doc.durationMs === "number" ? doc.durationMs : null,
        startedAt: doc.startedAt ?? null,
        endedAt: doc.endedAt ?? null,
        transport: doc.transport ?? null,
        locale: doc.locale ?? null,
        voice: doc.voice ?? null,
        metadata: metadataRaw ?? {},
        createdAt: doc.$createdAt,
        updatedAt: doc.$updatedAt,
    };
}
