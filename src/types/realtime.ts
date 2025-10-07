export type RealtimeTransportType = "webrtc" | "websocket";

export interface SessionGuardrailSnapshot {
    crisisDetected: boolean;
    escalationSuggested: boolean;
    policyViolation: boolean;
    [key: string]: unknown;
}

export interface SessionHistoryTranscriptItem {
    id: string;
    speaker: "user" | "companion" | "system";
    content: string;
    timestamp: string;
    confidence?: number;
    annotations?: string[];
}

export interface SessionHistoryRecord {
    historyId: string;
    sessionId: string | null;
    transcripts: SessionHistoryTranscriptItem[];
    summary: string | null;
    totalTranscriptCount?: number;
    guardrails: SessionGuardrailSnapshot | null;
    durationMs: number | null;
    startedAt: string | null;
    endedAt: string | null;
    transport: RealtimeTransportType | null;
    locale: string | null;
    voice: string | null;
    metadata: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}

export interface SessionHistorySummary {
    historyId: string;
    sessionId: string | null;
    transcripts: SessionHistoryTranscriptItem[];
    totalTranscriptCount: number;
    createdAt: string;
    updatedAt: string;
}
