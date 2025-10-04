"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TransportType = "webrtc" | "websocket";
export type ConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting";
export type MicrophoneState = "muted" | "unmuted" | "held";

export interface TranscriptItem {
    id: string;
    speaker: "user" | "companion" | "system";
    content: string;
    timestamp: string;
    confidence?: number;
    annotations?: string[];
}

export interface GuardrailFlags {
    crisisDetected: boolean;
    escalationSuggested: boolean;
    policyViolation: boolean;
}

export interface MoodInferenceSnapshot {
    sentiment: "positive" | "neutral" | "negative";
    arousal: "low" | "medium" | "high";
    confidence: number;
    supportingTranscriptId: string;
    cues: string[];
}

interface RecommendedIntervention {
    id: string;
    title: string;
    reason: string;
    priority: number;
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
    recommendedInterventions: RecommendedIntervention[];
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
    setRecommendedInterventions: (items: RecommendedIntervention[]) => void;
    updateGuardrails: (flags: Partial<GuardrailFlags>) => void;
    setAgentTyping: (value: boolean) => void;
    toggleCaptions: () => void;
    requestInterruption: () => void;
    resolveInterruption: () => void;
    getCurrentMoodInference: () => MoodInferenceSnapshot | null;
    getTopRecommendedIntervention: () => RecommendedIntervention | null;
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

const initialState = {
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
    recommendedInterventions: [] as RecommendedIntervention[],
    lastError: null as string | null,
    captionsEnabled: true,
    isAgentTyping: false,
    interruptionRequested: false,
};

const positiveCues = ["calm", "grateful", "hope", "relaxed", "optimistic", "better", "improving"];
const negativeCues = ["anxious", "stressed", "overwhelmed", "tired", "sad", "angry", "worried", "panic"];

const computeMoodInference = (
    transcripts: TranscriptItem[],
    audioEnergy: number,
    backgroundNoiseLevel: number
): MoodInferenceSnapshot | null => {
    const userTurns = transcripts.filter((item) => item.speaker === "user");
    const latest = userTurns.at(-1);
    if (!latest) {
        return null;
    }

    const normalizedText = latest.content.toLowerCase();
    let score = 0;
    const cues: string[] = [];

    positiveCues.forEach((cue) => {
        if (normalizedText.includes(cue)) {
            score += 1;
            cues.push(cue);
        }
    });

    negativeCues.forEach((cue) => {
        if (normalizedText.includes(cue)) {
            score -= 1;
            cues.push(cue);
        }
    });

    const sentiment: MoodInferenceSnapshot["sentiment"] = score > 1 ? "positive" : score < -1 ? "negative" : "neutral";

    const effectiveEnergy = Math.max(audioEnergy - backgroundNoiseLevel, 0);
    const arousal: MoodInferenceSnapshot["arousal"] = effectiveEnergy > 0.75 ? "high" : effectiveEnergy > 0.35 ? "medium" : "low";

    const confidence = Math.min(1, 0.5 + Math.min(Math.abs(score), 3) * 0.15 + effectiveEnergy * 0.2);

    return {
        sentiment,
        arousal,
        confidence,
        supportingTranscriptId: latest.id,
        cues,
    };
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
        recommendedInterventions: RecommendedIntervention[];
        guardrails: GuardrailFlags;
        moodContext: TranscriptItem[];
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
        (set, get) => ({
            ...initialState,
            setConnectionState: (state) => set({ connectionState: state }),
            setTransport: (transport) => set({ transport }),
            setMicrophoneState: (state) => set({ microphoneState: state }),
            setAudioEnergy: (energy) => set({ audioEnergy: energy }),
            setBackgroundNoiseLevel: (level) => set({ backgroundNoiseLevel: level }),
            pushTranscript: (item) => set((prev) => ({ transcripts: [...prev.transcripts, item] })),
            replaceTranscripts: (items) => set({ transcripts: items }),
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
            setRecommendedInterventions: (items) => set({ recommendedInterventions: items }),
            updateGuardrails: (flags) =>
                set((prev) => ({
                    guardrails: {
                        ...prev.guardrails,
                        ...flags,
                    },
                })),
            setAgentTyping: (value) => set({ isAgentTyping: value }),
            toggleCaptions: () => set((prev) => ({ captionsEnabled: !prev.captionsEnabled })),
            requestInterruption: () => set({ interruptionRequested: true }),
            resolveInterruption: () => set({ interruptionRequested: false }),
            getCurrentMoodInference: () =>
                computeMoodInference(get().transcripts, get().audioEnergy, get().backgroundNoiseLevel),
            getTopRecommendedIntervention: () => {
                const { recommendedInterventions } = get();
                return recommendedInterventions.length ? recommendedInterventions[0] : null;
            },
            clearSession: () => set({
                sessionId: null,
                clientSecret: null,
                transcripts: [],
                connectionState: "disconnected",
                guardrails: createDefaultGuardrails(),
                recommendedInterventions: [],
                microphoneState: "muted",
                captionsEnabled: true,
                isAgentTyping: false,
                audioEnergy: 0,
                backgroundNoiseLevel: 0,
                audioBuffers: [],
                toolCalls: [],
                lastError: null,
                interruptionRequested: false,
            }),
            startSession: async (options) => {
                if (get().isInitializing) {
                    return;
                }

                set({ isInitializing: true, lastError: null });
                set({ isAgentTyping: true });

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
                        recommendedInterventions: payload.recommendedInterventions ?? [],
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
                    });
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
                set({
                    connectionState: "disconnected",
                    sessionId: null,
                    clientSecret: null,
                    transcripts: [],
                    guardrails: createDefaultGuardrails(),
                    recommendedInterventions: [],
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
        }),
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
            }),
        }
    )
);

export type UseRealtimeSessionStore = typeof useRealtimeSessionStore;
