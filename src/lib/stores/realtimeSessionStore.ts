"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { evaluateInferenceAgainstHistory, inferMood, type MoodInferenceResult } from "@/lib/ai/mood-inference";
import { recommendInterventions } from "@/lib/ai/intervention-recommender";
import type { MoodCheckIn } from "@/types/mood";
import type { InterventionRecommendation } from "@/types/intervention";
import type { SessionHistoryRecord, SessionHistoryTranscriptItem } from "@/types/realtime";

export type TransportType = "webrtc" | "websocket";
export type ConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting";
export type MicrophoneState = "muted" | "unmuted" | "held";

export type TranscriptItem = SessionHistoryTranscriptItem;

export interface GuardrailFlags {
    crisisDetected: boolean;
    escalationSuggested: boolean;
    policyViolation: boolean;
}

export interface RealtimeSessionState {
    sessionId: string | null;
    clientSecret: string | null;
    transport: TransportType;
    connectionState: ConnectionState;
    locale: string;
    voice: string;
    isInitializing: boolean;
    microphoneState: MicrophoneState;
    audioEnergy: number;
    backgroundNoiseLevel: number;
    transcripts: TranscriptItem[];
    audioBuffers: AudioBufferMeta[];
    toolCalls: ToolCallMeta[];
    guardrails: GuardrailFlags;
    recommendedInterventions: InterventionRecommendation[];
    moodTimeline: MoodInferenceResult[];
    lastMoodTrend: "improving" | "stable" | "declining";
    lastMoodDelta: number;
    lastInferenceAt: string | null;
    recentCheckIns: MoodCheckIn[];
    sessionStartedAt: string | null;
    persistingHistory: boolean;
    historyError: string | null;
    historyId: string | null;
    historyTotalCount: number;
    lastError: string | null;
    captionsEnabled: boolean;
    isAgentTyping: boolean;
    interruptionRequested: boolean;
    setConnectionState: (state: ConnectionState) => void;
    setTransport: (transport: TransportType) => void;
    setMicrophoneState: (state: MicrophoneState) => void;
    setAudioEnergy: (energy: number) => void;
    setBackgroundNoiseLevel: (level: number) => void;
    pushTranscript: (item: TranscriptItem) => void;
    replaceTranscripts: (items: TranscriptItem[]) => void;
    appendAudioBuffer: (buffer: AudioBufferMeta) => void;
    clearAudioBuffers: () => void;
    registerToolCall: (call: ToolCallMeta) => void;
    updateToolCallStatus: (id: string, status: ToolCallMeta["status"], payload?: Partial<ToolCallMeta>) => void;
    setRecommendedInterventions: (items: InterventionRecommendation[]) => void;
    setRecentCheckIns: (items: MoodCheckIn[]) => void;
    updateGuardrails: (flags: Partial<GuardrailFlags>) => void;
    setAgentTyping: (value: boolean) => void;
    toggleCaptions: () => void;
    requestInterruption: () => void;
    resolveInterruption: () => void;
    refreshMoodInference: () => Promise<void>;
    persistSessionHistory: (options?: { endedAt?: string; finalize?: boolean }) => Promise<void>;
    exportPersistedHistory: (historyId?: string) => Promise<SessionHistoryRecord | null>;
    purgePersistedHistory: (options?: { historyId?: string }) => Promise<string[]>;
    getCurrentMoodInference: () => MoodInferenceResult | null;
    getTopRecommendedIntervention: () => InterventionRecommendation | null;
    clearSession: () => void;
    startSession: (options?: Partial<{ transport: TransportType; locale: string; voice: string }>) => Promise<void>;
    endSession: () => Promise<void>;
    relayEvent: (event: unknown) => Promise<void>;
}

export interface AudioBufferMeta {
    id: string;
    direction: "incoming" | "outgoing";
    size: number;
    timestamp: string;
}
export interface ToolCallMeta {
    id: string;
    name: string;
    status: "pending" | "approved" | "rejected";
    createdAt: string;
    resolvedAt?: string;
    payload?: unknown;
}

const createDefaultGuardrails = (): GuardrailFlags => ({
    crisisDetected: false,
    escalationSuggested: false,
    policyViolation: false,
});

const PRIORITY_VALUE: Record<InterventionRecommendation["priority"], number> = {
    high: 0,
    medium: 1,
    low: 2,
};

const normalizeRecommendations = (items: InterventionRecommendation[]): InterventionRecommendation[] =>
    items
        .slice()
        .sort((a, b) => PRIORITY_VALUE[a.priority] - PRIORITY_VALUE[b.priority]);

const PERSIST_TRANSCRIPT_LIMIT = 50;
const PERSIST_MOOD_TIMELINE_LIMIT = 24;
const PERSIST_RECOMMENDATION_LIMIT = 5;
const AUTO_PERSIST_DELAY_MS = 4000;

const isSafetyAnnotation = (annotation: string): boolean => /guardrail|safety|crisis/i.test(annotation);

const pruneTranscriptsForPersistence = (items: TranscriptItem[]): TranscriptItem[] => {
    if (items.length <= PERSIST_TRANSCRIPT_LIMIT) {
        return items;
    }

    const flagged = items.filter((item) =>
        (item.annotations ?? []).some((annotation) => isSafetyAnnotation(annotation))
    );
    const recent = items.slice(-PERSIST_TRANSCRIPT_LIMIT);
    const merged = new Map<string, TranscriptItem>();

    for (const entry of [...flagged, ...recent]) {
        merged.set(entry.id, entry);
    }

    return Array.from(merged.values()).sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
};

let historyAutoPersistHandle: ReturnType<typeof setTimeout> | null = null;

type RealtimeSessionData = Omit<
    RealtimeSessionState,
    | "setConnectionState"
    | "setTransport"
    | "setMicrophoneState"
    | "setAudioEnergy"
    | "setBackgroundNoiseLevel"
    | "pushTranscript"
    | "replaceTranscripts"
    | "appendAudioBuffer"
    | "clearAudioBuffers"
    | "registerToolCall"
    | "updateToolCallStatus"
    | "setRecommendedInterventions"
    | "setRecentCheckIns"
    | "updateGuardrails"
    | "setAgentTyping"
    | "toggleCaptions"
    | "requestInterruption"
    | "resolveInterruption"
    | "refreshMoodInference"
    | "persistSessionHistory"
    | "exportPersistedHistory"
    | "purgePersistedHistory"
    | "getCurrentMoodInference"
    | "getTopRecommendedIntervention"
    | "clearSession"
    | "startSession"
    | "endSession"
    | "relayEvent"
>;

const initialState: RealtimeSessionData = {
    sessionId: null as string | null,
    clientSecret: null as string | null,
    transport: "webrtc" as TransportType,
    connectionState: "disconnected" as ConnectionState,
    locale: "en-US",
    voice: "alloy",
    isInitializing: false,
    microphoneState: "muted" as MicrophoneState,
    audioEnergy: 0,
    backgroundNoiseLevel: 0,
    transcripts: [] as TranscriptItem[],
    audioBuffers: [] as AudioBufferMeta[],
    toolCalls: [] as ToolCallMeta[],
    guardrails: createDefaultGuardrails(),
    recommendedInterventions: [] as InterventionRecommendation[],
    moodTimeline: [] as MoodInferenceResult[],
    lastMoodTrend: "stable",
    lastMoodDelta: 0,
    lastInferenceAt: null as string | null,
    recentCheckIns: [] as MoodCheckIn[],
    sessionStartedAt: null as string | null,
    persistingHistory: false,
    historyError: null as string | null,
    historyId: null as string | null,
    historyTotalCount: 0,
    lastError: null as string | null,
    captionsEnabled: true,
    isAgentTyping: false,
    interruptionRequested: false,
};

const computeDurationMs = (startedAt: string | null, endedAt: string): number | null => {
    if (!startedAt) {
        return null;
    }

    const start = Date.parse(startedAt);
    const end = Date.parse(endedAt);

    if (Number.isNaN(start) || Number.isNaN(end)) {
        return null;
    }

    return Math.max(end - start, 0);
};

const buildHistoryRequestBody = (
    state: RealtimeSessionState,
    options: {
        snapshotAt: string;
        endedAt: string | null;
        finalize: boolean;
        durationMs: number | null;
    }
) => {
    const transcripts = pruneTranscriptsForPersistence(state.transcripts);

    return {
        sessionId: state.sessionId,
        transcripts,
        recommendedInterventions: state.recommendedInterventions.slice(0, PERSIST_RECOMMENDATION_LIMIT),
        guardrails: state.guardrails,
        moodInferenceTimeline: state.moodTimeline.slice(-PERSIST_MOOD_TIMELINE_LIMIT),
        durationMs: options.durationMs,
        startedAt: state.sessionStartedAt,
        endedAt: options.endedAt,
        transport: state.transport,
        locale: state.locale,
        voice: state.voice,
        metadata: {
            lastMoodTrend: state.lastMoodTrend,
            lastMoodDelta: state.lastMoodDelta,
            lastInferenceAt: state.lastInferenceAt,
            snapshotAt: options.snapshotAt,
            totalTranscriptCount: state.transcripts.length,
        },
    } satisfies Record<string, unknown>;
};

const canPersistHistory = (state: RealtimeSessionState): boolean =>
    Boolean(state.sessionId && state.transcripts.length > 0 && !state.persistingHistory);

const submitHistoryPayload = async (
    body: Record<string, unknown>,
    historyId: string | null
): Promise<{ historyId: string; storedAt: string }> => {
    const method = historyId ? "PATCH" : "POST";
    const response = await fetch("/api/realtime/history", {
        method,
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(historyId ? { ...body, historyId } : body),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error((payload as { error?: string }).error ?? "Failed to persist history");
    }

    return payload as { historyId: string; storedAt: string };
};

const fetchHistorySnapshot = async (historyId?: string): Promise<SessionHistoryRecord | null> => {
    const params = new URLSearchParams();
    if (historyId) {
        params.set("historyId", historyId);
    } else {
        params.set("limit", "1");
    }

    const query = params.toString();
    const response = await fetch(`/api/realtime/history${query ? `?${query}` : ""}`, {
        method: "GET",
        credentials: "include",
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error((payload as { error?: string }).error ?? "Failed to load history");
    }

    if (historyId) {
        return payload as SessionHistoryRecord;
    }

    const histories = (payload as { histories?: SessionHistoryRecord[] }).histories ?? [];
    return histories[0] ?? null;
};

const deleteHistoryRecords = async (body: { historyId?: string; purgeAll?: boolean }): Promise<string[]> => {
    const response = await fetch("/api/realtime/history", {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error((payload as { error?: string }).error ?? "Failed to delete history");
    }

    return (payload as { deleted?: string[] }).deleted ?? [];
};

const mergeTranscripts = (history: TranscriptItem[], fallback: TranscriptItem[]): TranscriptItem[] => {
    if (history.length === 0) {
        return fallback;
    }

    const merged = new Map<string, TranscriptItem>();
    for (const item of history) {
        merged.set(item.id, item);
    }
    for (const item of fallback) {
        merged.set(item.id, item);
    }

    return Array.from(merged.values()).sort(
        (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)
    );
};

async function bootstrapSession(options: Partial<{ transport: TransportType; locale: string; voice: string }>) {
    const response = await fetch("/api/realtime/session", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(options ?? {}),
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message = (payload as { error?: string }).error ?? "Failed to start realtime session";
        throw new Error(message);
    }

    return (await response.json()) as {
        sessionId: string;
        clientSecret: string | null;
        transport: TransportType;
        locale: string;
        voice: string;
        connectionState: ConnectionState;
        recommendedInterventions: InterventionRecommendation[];
        guardrails: GuardrailFlags;
        moodContext: TranscriptItem[];
        checkIns?: MoodCheckIn[];
        instructionMeta?: {
            personaVersion: string | null;
            sections: Array<{ title: string; body: string }>;
            guardrailDirectives: string[];
            preferenceSummary: string[];
            personalizationSummary: string;
        };
        sessionConfig?: Record<string, unknown>;
    };
}

async function closeSession(sessionId: string | null) {
    if (!sessionId) return;

    await fetch("/api/realtime/events", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
            sessionId,
            event: { type: "session.end" },
        }),
    }).catch(() => undefined);
}

export const useRealtimeSessionStore = create<RealtimeSessionState>()(
    persist(
        (set, get) => {
            const runMoodInference = async () => {
                const state = get();
                if (!state.sessionId || state.transcripts.length === 0) {
                    return;
                }

                try {
                    const result = await inferMood({
                        transcripts: state.transcripts,
                        audioEnergy: state.audioEnergy,
                        backgroundNoiseLevel: state.backgroundNoiseLevel,
                        guardrails: state.guardrails,
                        recentCheckIns: state.recentCheckIns.slice(0, 5),
                        fallbackToEdgeModel: true,
                    });

                    if (!result) {
                        return;
                    }

                    set((prev) => {
                        const timeline = [...prev.moodTimeline.slice(-24), result];
                        const trendSummary = evaluateInferenceAgainstHistory(result, prev.moodTimeline);
                        const recommendations = normalizeRecommendations(
                            recommendInterventions(result, {
                                checkIns: state.recentCheckIns,
                                moodHistory: timeline,
                            })
                        );

                        return {
                            moodTimeline: timeline,
                            lastMoodTrend: trendSummary.trend,
                            lastMoodDelta: trendSummary.delta,
                            lastInferenceAt: new Date().toISOString(),
                            recommendedInterventions: recommendations.length ? recommendations : prev.recommendedInterventions,
                        };
                    });
                    scheduleAutoPersist();
                } catch (error) {
                    console.warn("Mood inference failed", error);
                }
            };

            const persistHistory = async (options?: { endedAt?: string; finalize?: boolean }) => {
                const state = get();
                if (!canPersistHistory(state)) {
                    return;
                }

                set({ persistingHistory: true, historyError: null });

                if (historyAutoPersistHandle) {
                    clearTimeout(historyAutoPersistHandle);
                    historyAutoPersistHandle = null;
                }

                const snapshotAt = new Date().toISOString();
                const finalize = options?.finalize ?? false;
                const endedAt = finalize ? options?.endedAt ?? snapshotAt : null;
                const referencePoint = endedAt ?? snapshotAt;
                const durationMs = computeDurationMs(state.sessionStartedAt, referencePoint);
                const body = buildHistoryRequestBody(state, {
                    snapshotAt,
                    endedAt,
                    finalize,
                    durationMs,
                });

                try {
                    const result = await submitHistoryPayload(body, state.historyId);
                    set({
                        persistingHistory: false,
                        historyError: null,
                        historyId: result.historyId,
                        historyTotalCount: state.transcripts.length,
                    });
                } catch (error) {
                    const message = error instanceof Error ? error.message : "Failed to persist history";
                    set({ persistingHistory: false, historyError: message });
                    console.error("Realtime history persistence failed", error);
                    throw error;
                }
            };

            const scheduleAutoPersist = () => {
                const state = get();
                if (!state.sessionId || state.transcripts.length === 0 || state.persistingHistory) {
                    return;
                }

                if (historyAutoPersistHandle) {
                    clearTimeout(historyAutoPersistHandle);
                }

                historyAutoPersistHandle = setTimeout(() => {
                    historyAutoPersistHandle = null;
                    void persistHistory({ finalize: false });
                }, AUTO_PERSIST_DELAY_MS);
            };

            const shouldTriggerFromEnergy = (previous: number, next: number) => Math.abs(previous - next) > 0.18;

            return {
                ...initialState,
                setConnectionState: (state) => set({ connectionState: state }),
                setTransport: (transport) => set({ transport }),
                setMicrophoneState: (state) => set({ microphoneState: state }),
                setAudioEnergy: (energy) => {
                    const prevEnergy = get().audioEnergy;
                    set({ audioEnergy: energy });
                    if (shouldTriggerFromEnergy(prevEnergy, energy)) {
                        void runMoodInference();
                    }
                },
                setBackgroundNoiseLevel: (level) => {
                    const prevLevel = get().backgroundNoiseLevel;
                    set({ backgroundNoiseLevel: level });
                    if (shouldTriggerFromEnergy(prevLevel, level)) {
                        void runMoodInference();
                    }
                },
                pushTranscript: (item) => {
                    set((prev) => ({ transcripts: [...prev.transcripts, item] }));
                    void runMoodInference();
                    scheduleAutoPersist();
                },
                replaceTranscripts: (items) => {
                    set({ transcripts: items });
                    void runMoodInference();
                    scheduleAutoPersist();
                },
                appendAudioBuffer: (buffer) =>
                    set((prev) => ({
                        audioBuffers: [...prev.audioBuffers.slice(-24), buffer],
                    })),
                clearAudioBuffers: () => set({ audioBuffers: [] }),
                registerToolCall: (call) =>
                    set((prev) => ({
                        toolCalls: [...prev.toolCalls.filter((item) => item.id !== call.id), call],
                    })),
                updateToolCallStatus: (id, status, payload) =>
                    set((prev) => ({
                        toolCalls: prev.toolCalls.map((item) =>
                            item.id === id
                                ? {
                                    ...item,
                                    status,
                                    resolvedAt: status !== "pending" ? new Date().toISOString() : item.resolvedAt,
                                    ...(payload ?? {}),
                                }
                                : item
                        ),
                    })),
                setRecommendedInterventions: (items) => {
                    set({ recommendedInterventions: normalizeRecommendations(items) });
                    scheduleAutoPersist();
                },
                setRecentCheckIns: (items) => {
                    set({ recentCheckIns: items });
                    void runMoodInference();
                },
                updateGuardrails: (flags) => {
                    set((prev) => ({
                        guardrails: {
                            ...prev.guardrails,
                            ...flags,
                        },
                    }));
                    void runMoodInference();
                    scheduleAutoPersist();
                },
                setAgentTyping: (value) => set({ isAgentTyping: value }),
                toggleCaptions: () => set((prev) => ({ captionsEnabled: !prev.captionsEnabled })),
                requestInterruption: () => set({ interruptionRequested: true }),
                resolveInterruption: () => set({ interruptionRequested: false }),
                refreshMoodInference: runMoodInference,
                persistSessionHistory: persistHistory,
                exportPersistedHistory: async (historyId) => {
                    const state = get();
                    const targetHistoryId = historyId ?? state.historyId ?? undefined;

                    try {
                        const record = await fetchHistorySnapshot(targetHistoryId);
                        if (!record) {
                            return null;
                        }

                        set((prev) => {
                            const mergedTranscripts = mergeTranscripts(record.transcripts, prev.transcripts);
                            return {
                                transcripts: mergedTranscripts,
                                historyId: record.historyId,
                                historyTotalCount: record.totalTranscriptCount ?? record.transcripts.length,
                                historyError: null,
                            };
                        });

                        return record;
                    } catch (error) {
                        const message = error instanceof Error ? error.message : "Failed to load history";
                        set({ historyError: message });
                        throw error;
                    }
                },
                purgePersistedHistory: async (options) => {
                    try {
                        const payload = options?.historyId
                            ? { historyId: options.historyId }
                            : { purgeAll: true };

                        const currentState = get();
                        const deleted = await deleteHistoryRecords(payload);
                        const shouldReset =
                            !options?.historyId ||
                            (currentState.historyId !== null && deleted.includes(currentState.historyId));

                        if (shouldReset) {
                            set({
                                historyId: null,
                                historyTotalCount: 0,
                                historyError: null,
                                ...(options?.historyId ? {} : { transcripts: [] as TranscriptItem[] }),
                            });
                        } else {
                            set({ historyError: null });
                        }

                        return deleted;
                    } catch (error) {
                        const message = error instanceof Error ? error.message : "Failed to delete history";
                        set({ historyError: message });
                        throw error;
                    }
                },
                getCurrentMoodInference: () => {
                    const timeline = get().moodTimeline;
                    return timeline.length ? timeline[timeline.length - 1] : null;
                },
                getTopRecommendedIntervention: () => {
                    const list = normalizeRecommendations(get().recommendedInterventions);
                    return list[0] ?? null;
                },
                clearSession: () => {
                    if (historyAutoPersistHandle) {
                        clearTimeout(historyAutoPersistHandle);
                        historyAutoPersistHandle = null;
                    }

                    set({
                        sessionId: null,
                        clientSecret: null,
                        transcripts: [],
                        connectionState: "disconnected",
                        guardrails: createDefaultGuardrails(),
                        recommendedInterventions: [],
                        moodTimeline: [],
                        lastMoodTrend: "stable",
                        lastMoodDelta: 0,
                        lastInferenceAt: null,
                        recentCheckIns: [],
                        sessionStartedAt: null,
                        persistingHistory: false,
                        historyError: null,
                        historyId: null,
                        historyTotalCount: 0,
                        microphoneState: "muted",
                        captionsEnabled: true,
                        isAgentTyping: false,
                        audioEnergy: 0,
                        backgroundNoiseLevel: 0,
                        audioBuffers: [],
                        toolCalls: [],
                        lastError: null,
                        interruptionRequested: false,
                    });
                },
                startSession: async (options) => {
                    if (get().isInitializing) {
                        return;
                    }

                    set({ isInitializing: true, lastError: null, isAgentTyping: true });

                    if (historyAutoPersistHandle) {
                        clearTimeout(historyAutoPersistHandle);
                        historyAutoPersistHandle = null;
                    }

                    try {
                        const payload = await bootstrapSession(options ?? {});
                        set({
                            sessionId: payload.sessionId,
                            clientSecret: payload.clientSecret,
                            transport: payload.transport,
                            locale: payload.locale,
                            voice: payload.voice,
                            connectionState: payload.connectionState,
                            transcripts: payload.moodContext ?? [],
                            recommendedInterventions: normalizeRecommendations(payload.recommendedInterventions ?? []),
                            guardrails: payload.guardrails ?? createDefaultGuardrails(),
                            isInitializing: false,
                            microphoneState: "muted",
                            captionsEnabled: true,
                            isAgentTyping: false,
                            audioEnergy: 0,
                            backgroundNoiseLevel: 0,
                            audioBuffers: [],
                            toolCalls: [],
                            interruptionRequested: false,
                            moodTimeline: [],
                            lastMoodTrend: "stable",
                            lastMoodDelta: 0,
                            lastInferenceAt: null,
                            recentCheckIns: payload.checkIns ?? [],
                            sessionStartedAt: new Date().toISOString(),
                            historyError: null,
                            historyTotalCount: 0,
                        });
                        if ((payload.checkIns ?? []).length) {
                            void runMoodInference();
                        }

                        const existingHistoryId = get().historyId;
                        if (existingHistoryId) {
                            void (async () => {
                                try {
                                    const record = await fetchHistorySnapshot(existingHistoryId);
                                    if (!record) {
                                        return;
                                    }

                                    set((prev) => {
                                        const nextTotal = record.totalTranscriptCount ?? record.transcripts.length;
                                        if (
                                            record.historyId === prev.historyId &&
                                            nextTotal <= prev.historyTotalCount
                                        ) {
                                            return { historyError: null };
                                        }

                                        const mergedTranscripts = mergeTranscripts(
                                            record.transcripts,
                                            prev.transcripts
                                        );

                                        return {
                                            transcripts: mergedTranscripts,
                                            historyId: record.historyId,
                                            historyTotalCount: nextTotal,
                                            historyError: null,
                                        };
                                    });
                                } catch (error) {
                                    console.warn("Failed to hydrate persisted history", error);
                                }
                            })();
                        }
                    } catch (error) {
                        const message = error instanceof Error ? error.message : "Failed to start realtime session";
                        set({ lastError: message, isInitializing: false, isAgentTyping: false });
                        throw error;
                    }
                },
                endSession: async () => {
                    const { sessionId } = get();
                    if (!sessionId) return;
                    await closeSession(sessionId);
                    try {
                        await persistHistory({ endedAt: new Date().toISOString(), finalize: true });
                    } catch (error) {
                        const message = error instanceof Error ? error.message : "Failed to persist session history";
                        set({ lastError: message });
                    }

                    if (historyAutoPersistHandle) {
                        clearTimeout(historyAutoPersistHandle);
                        historyAutoPersistHandle = null;
                    }

                    set({
                        connectionState: "disconnected",
                        sessionId: null,
                        clientSecret: null,
                        transcripts: [],
                        guardrails: createDefaultGuardrails(),
                        recommendedInterventions: [],
                        moodTimeline: [],
                        lastMoodTrend: "stable",
                        lastMoodDelta: 0,
                        lastInferenceAt: null,
                        recentCheckIns: [],
                        sessionStartedAt: null,
                        persistingHistory: false,
                        historyError: null,
                        historyId: null,
                        historyTotalCount: 0,
                        microphoneState: "muted",
                        captionsEnabled: true,
                        isAgentTyping: false,
                        audioEnergy: 0,
                        backgroundNoiseLevel: 0,
                        audioBuffers: [],
                        toolCalls: [],
                        lastError: null,
                        interruptionRequested: false,
                    });
                },
                relayEvent: async (event) => {
                    const { sessionId } = get();
                    if (!sessionId) {
                        throw new Error("No realtime session is active");
                    }

                    set({ isAgentTyping: true });
                    const response = await fetch("/api/realtime/events", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        credentials: "include",
                        body: JSON.stringify({ sessionId, event }),
                    });

                    if (!response.ok) {
                        const payload = await response.json().catch(() => ({}));
                        const message = (payload as { error?: string }).error ?? "Failed to relay event";
                        set({ isAgentTyping: false });
                        throw new Error(message);
                    }

                    set({ isAgentTyping: false });
                },
            };
        },
        {
            name: "realtime-session-store",
            partialize: (state) => ({
                sessionId: state.sessionId,
                transport: state.transport,
                locale: state.locale,
                voice: state.voice,
                transcripts: state.transcripts.slice(-20),
                recommendedInterventions: state.recommendedInterventions,
                guardrails: { ...state.guardrails },
                captionsEnabled: state.captionsEnabled,
                moodTimeline: state.moodTimeline.slice(-10),
                lastMoodTrend: state.lastMoodTrend,
                lastMoodDelta: state.lastMoodDelta,
                recentCheckIns: state.recentCheckIns.slice(0, 5),
                historyId: state.historyId,
                historyTotalCount: state.historyTotalCount,
            }),
        }
    )
);

export type UseRealtimeSessionStore = typeof useRealtimeSessionStore;
