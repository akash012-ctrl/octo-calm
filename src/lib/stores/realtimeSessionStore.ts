"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
    createRealtimeAgent,
    createRealtimeSession,
    type RealtimeSessionHandle,
} from "@/lib/ai/realtimeClient";
import {
    OpenAIRealtimeWebRTC,
    type RealtimeItem,
    type RealtimeSessionConfig,
} from "@openai/agents-realtime";
import type { SessionHistoryRecord, SessionHistoryTranscriptItem } from "@/types/realtime";

type TransportConfig = "webrtc" | "websocket";
export type TransportType = TransportConfig;
export type ConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting";
export type MicrophoneState = "muted" | "unmuted" | "held";

export type TranscriptItem = SessionHistoryTranscriptItem;

interface BootstrapSessionPayload {
    sessionId: string;
    clientSecret: string | null;
    transport: TransportType;
    locale: string;
    voice: string;
    connectionState: ConnectionState;
    instructionMeta?: {
        personaVersion: string | null;
        sections: Array<{ title: string; body: string }>;
    };
    sessionConfig?: Partial<RealtimeSessionConfig> | null;
    relaySessionId: string | null;
}

export interface RealtimeSessionState {
    sessionId: string | null;
    relaySessionId: string | null;
    clientSecret: string | null;
    transport: TransportType;
    connectionState: ConnectionState;
    locale: string;
    voice: string;
    sessionConfig: Partial<RealtimeSessionConfig> | null;
    isInitializing: boolean;
    microphoneState: MicrophoneState;
    audioEnergy: number;
    transcripts: TranscriptItem[];
    captionsEnabled: boolean;
    isAgentTyping: boolean;
    lastError: string | null;
    sessionStartedAt: string | null;
    summary: string | null;
    summaryLoading: boolean;
    summaryError: string | null;
    historyId: string | null;
    historyTotalCount: number;
    persistingHistory: boolean;
    historyError: string | null;
    setConnectionState: (state: ConnectionState) => void;
    setTransport: (transport: TransportType) => void;
    setMicrophoneState: (state: MicrophoneState) => void;
    toggleCaptions: () => void;
    startSession: (options?: Partial<{ transport: TransportType; locale: string; voice: string }>) => Promise<void>;
    endSession: () => Promise<void>;
    clearSession: () => void;
    generateSummary: () => Promise<string | null>;
    persistSessionHistory: (options?: { endedAt?: string; finalize?: boolean }) => Promise<void>;
    exportPersistedHistory: (historyId?: string) => Promise<SessionHistoryRecord | null>;
    purgePersistedHistory: (options?: { historyId?: string }) => Promise<string[]>;
    relayEvent: (event: unknown) => Promise<void>;
}

type RealtimeSessionData = Omit<
    RealtimeSessionState,
    | "setConnectionState"
    | "setTransport"
    | "setMicrophoneState"
    | "toggleCaptions"
    | "startSession"
    | "endSession"
    | "clearSession"
    | "generateSummary"
    | "persistSessionHistory"
    | "exportPersistedHistory"
    | "purgePersistedHistory"
    | "relayEvent"
>;

const initialState: RealtimeSessionData = {
    sessionId: null,
    relaySessionId: null,
    clientSecret: null,
    transport: "webrtc",
    connectionState: "disconnected",
    locale: "en-US",
    voice: "alloy",
    sessionConfig: null,
    isInitializing: false,
    microphoneState: "muted",
    audioEnergy: 0,
    transcripts: [],
    captionsEnabled: true,
    isAgentTyping: false,
    lastError: null,
    sessionStartedAt: null,
    summary: null,
    summaryLoading: false,
    summaryError: null,
    historyId: null,
    historyTotalCount: 0,
    persistingHistory: false,
    historyError: null,
};

const isBrowser = typeof window !== "undefined";

let activeRealtimeHandle: RealtimeSessionHandle | null = null;
let remoteAudioElement: HTMLAudioElement | null = null;
let microphoneStream: MediaStream | null = null;
let audioContext: AudioContext | null = null;
let audioSourceNode: MediaStreamAudioSourceNode | null = null;
let audioAnalyserNode: AnalyserNode | null = null;
let audioMeterFrameId: number | null = null;
const transcriptCache = new Map<string, TranscriptItem>();

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

    return (await response.json()) as BootstrapSessionPayload;
}

async function closeSession(sessionId: string | null, relaySessionId: string | null) {
    if (!relaySessionId) {
        return;
    }

    await fetch("/api/realtime/events", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
            sessionId,
            relaySessionId,
            event: { type: "session.end" },
        }),
    }).catch(() => undefined);
}

const ensureAudioElement = (): HTMLAudioElement | null => {
    if (!isBrowser) {
        return null;
    }

    if (remoteAudioElement) {
        return remoteAudioElement;
    }

    const element = document.createElement("audio");
    element.autoplay = true;
    element.hidden = true;
    document.body.appendChild(element);
    remoteAudioElement = element;
    return element;
};

const ensureMicrophoneStream = async (): Promise<MediaStream> => {
    if (!isBrowser) {
        throw new Error("Realtime voice requires a browser environment.");
    }

    if (microphoneStream && microphoneStream.active) {
        return microphoneStream;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone access is not supported in this browser.");
    }

    microphoneStream = await navigator.mediaDevices.getUserMedia({
        audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
        },
    });

    return microphoneStream;
};

const stopAudioMonitor = async () => {
    if (isBrowser && audioMeterFrameId !== null) {
        window.cancelAnimationFrame(audioMeterFrameId);
        audioMeterFrameId = null;
    }

    if (audioSourceNode) {
        try {
            audioSourceNode.disconnect();
        } catch (error) {
            console.warn("Failed to disconnect audio source", error);
        }
        audioSourceNode = null;
    }

    if (audioAnalyserNode) {
        try {
            audioAnalyserNode.disconnect();
        } catch (error) {
            console.warn("Failed to disconnect audio analyser", error);
        }
        audioAnalyserNode = null;
    }

    if (audioContext) {
        try {
            await audioContext.close();
        } catch (error) {
            console.warn("Failed to close audio context", error);
        }
        audioContext = null;
    }
};

const startAudioMonitor = async (stream: MediaStream, set: (partial: Partial<RealtimeSessionState>) => void) => {
    if (!isBrowser) {
        return;
    }

    await stopAudioMonitor();

    try {
        audioContext = new AudioContext();
    } catch (error) {
        console.warn("Failed to create audio context", error);
        audioContext = null;
        return;
    }

    await audioContext.resume().catch(() => undefined);

    audioSourceNode = audioContext.createMediaStreamSource(stream);
    audioAnalyserNode = audioContext.createAnalyser();
    audioAnalyserNode.fftSize = 512;
    audioSourceNode.connect(audioAnalyserNode);

    const buffer = new Float32Array(audioAnalyserNode.fftSize);

    const update = () => {
        if (!audioAnalyserNode) {
            return;
        }

        audioAnalyserNode.getFloatTimeDomainData(buffer);
        let sumSquares = 0;
        for (let index = 0; index < buffer.length; index += 1) {
            const value = buffer[index];
            sumSquares += value * value;
        }

        const rms = Math.sqrt(sumSquares / buffer.length);
        const normalized = Math.min(1, Math.max(0, rms * 5));

        set({ audioEnergy: normalized });
        audioMeterFrameId = window.requestAnimationFrame(update);
    };

    update();
};

const isMessageItem = (item: RealtimeItem): item is {
    itemId: string;
    type: "message";
    role: "assistant" | "user" | "system";
    content: Array<{ type?: string; text?: string; transcript?: string | null }>;
} =>
    typeof item === "object" &&
    item !== null &&
    (item as { type?: unknown }).type === "message" &&
    typeof (item as { itemId?: unknown }).itemId === "string" &&
    typeof (item as { role?: unknown }).role === "string";

const mapRealtimeRoleToSpeaker = (role: "assistant" | "user" | "system"): TranscriptItem["speaker"] => {
    switch (role) {
        case "assistant":
            return "companion";
        case "system":
            return "system";
        default:
            return "user";
    }
};

const extractContentFromMessage = (message: {
    content?: Array<{ type?: string; text?: string; transcript?: string | null }>;
}): string => {
    const parts: string[] = [];
    const entries = Array.isArray(message.content) ? message.content : [];

    for (const entry of entries) {
        if ((entry.type === "input_text" || entry.type === "output_text") && entry.text) {
            parts.push(entry.text);
        } else if (
            (entry.type === "input_audio" || entry.type === "output_audio") &&
            typeof entry.transcript === "string" &&
            entry.transcript
        ) {
            parts.push(entry.transcript);
        }
    }

    return parts.join(" ").replace(/\s+/g, " ").trim();
};

async function fetchHistorySnapshot(historyId?: string): Promise<SessionHistoryRecord | null> {
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
}

async function submitHistoryPayload(
    body: Record<string, unknown>,
    historyId: string | null
): Promise<{ historyId: string; storedAt: string }> {
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
}

async function deleteHistoryRecords(body: { historyId?: string; purgeAll?: boolean }): Promise<string[]> {
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
}

async function cleanupRealtimeSession() {
    if (activeRealtimeHandle) {
        try {
            activeRealtimeHandle.dispose();
        } catch (error) {
            console.warn("Failed to dispose realtime session", error);
        }
        activeRealtimeHandle = null;
    }

    await stopAudioMonitor();

    if (microphoneStream) {
        microphoneStream.getTracks().forEach((track) => {
            try {
                track.stop();
            } catch (error) {
                console.warn("Failed to stop microphone track", error);
            }
        });
        microphoneStream = null;
    }

    if (remoteAudioElement) {
        remoteAudioElement.pause();
        remoteAudioElement.srcObject = null;
        remoteAudioElement.remove();
        remoteAudioElement = null;
    }

    transcriptCache.clear();
}

const buildHistoryRequestBody = (
    state: RealtimeSessionState,
    options: { snapshotAt: string; endedAt: string | null; finalize: boolean; durationMs: number | null }
) => ({
    sessionId: state.sessionId,
    transcripts: state.transcripts,
    summary: state.summary,
    guardrails: null,
    durationMs: options.durationMs,
    startedAt: state.sessionStartedAt,
    endedAt: options.endedAt,
    transport: state.transport,
    locale: state.locale,
    voice: state.voice,
    metadata: {
        personaVersion: state.sessionConfig?.providerData?.personaVersion ?? null,
        instructionsDigest: Array.isArray(state.sessionConfig?.instructions)
            ? state.sessionConfig?.instructions
            : state.sessionConfig?.instructions ?? null,
        snapshotAt: options.snapshotAt,
    },
});

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

export const useRealtimeSessionStore = create<RealtimeSessionState>()(
    persist(
        (set, get) => {
            const connectRealtimeSession = async (payload: BootstrapSessionPayload) => {
                if (!payload.clientSecret) {
                    throw new Error(
                        "Realtime companion is not configured. Set OPENAI_API_KEY on the server to enable voice sessions."
                    );
                }

                if (!isBrowser) {
                    set({
                        isInitializing: false,
                        isAgentTyping: false,
                        connectionState: "connected",
                    });
                    return;
                }

                await cleanupRealtimeSession();

                let transportOverride: OpenAIRealtimeWebRTC | undefined;
                let stream: MediaStream | null = null;

                if (payload.transport === "webrtc") {
                    stream = await ensureMicrophoneStream();
                    const audioElement = ensureAudioElement() ?? undefined;
                    transportOverride = new OpenAIRealtimeWebRTC({
                        mediaStream: stream,
                        audioElement,
                    });
                }

                const instructions =
                    typeof payload.sessionConfig?.instructions === "string"
                        ? payload.sessionConfig.instructions
                        : payload.instructionMeta?.sections?.map((section) => section.body).join("\n\n") ??
                        "You are a calm psychiatrist supporting veterans. Lead with safety, clarity, and respect.";

                const agent = createRealtimeAgent({
                    instructions,
                    voice: payload.voice,
                });

                const handle = await createRealtimeSession({
                    agent,
                    apiKey: () => payload.clientSecret as string,
                    model:
                        typeof payload.sessionConfig?.model === "string"
                            ? payload.sessionConfig.model
                            : undefined,
                    transport: transportOverride ?? payload.transport,
                    sessionOptions: {
                        transport: payload.transport,
                        config: (payload.sessionConfig ?? {}) as Partial<RealtimeSessionConfig>,
                    },
                    reconnect: {
                        maxAttempts: 4,
                        baseDelayMs: 500,
                        maxDelayMs: 3000,
                        jitterMs: 250,
                        onAttempt: (attempt) => {
                            set({
                                connectionState: attempt === 1 ? "connecting" : "reconnecting",
                            });
                        },
                        onRecovered: () => set({ connectionState: "connected" }),
                    },
                    timeoutMs: 20000,
                });

                activeRealtimeHandle = handle;

                const { session, transport } = handle;

                const connectionHandler = (status: string) => {
                    if (status === "connected") {
                        set({ connectionState: "connected" });
                    } else if (status === "connecting") {
                        set((previous) => ({
                            connectionState:
                                previous.connectionState === "connected" ? "reconnecting" : "connecting",
                        }));
                    } else {
                        set({ connectionState: "disconnected" });
                    }
                };

                transport.on("connection_change", connectionHandler);
                session.on("error", (payloadError) => {
                    const message =
                        payloadError?.error instanceof Error
                            ? payloadError.error.message
                            : "Realtime session error";
                    set({ lastError: message });
                });

                const agentStartHandler = () => set({ isAgentTyping: true });
                const agentEndHandler = () => set({ isAgentTyping: false });

                session.on("agent_start", agentStartHandler);
                session.on("agent_end", agentEndHandler);

                const historyHandler = (history: RealtimeItem[]) => {
                    const transcripts: TranscriptItem[] = [];
                    const seen = new Set<string>();
                    const defaultTimestamp = new Date().toISOString();

                    for (const item of history) {
                        if (!isMessageItem(item) || item.role === "system") {
                            continue;
                        }

                        const content = extractContentFromMessage(item);
                        if (!content) {
                            continue;
                        }

                        const previous = transcriptCache.get(item.itemId);
                        const transcript: TranscriptItem = {
                            id: item.itemId,
                            speaker: mapRealtimeRoleToSpeaker(item.role),
                            content,
                            timestamp: previous?.timestamp ?? defaultTimestamp,
                            annotations: previous?.annotations ?? [],
                            confidence: previous?.confidence,
                        };

                        transcriptCache.set(item.itemId, transcript);
                        transcripts.push(transcript);
                        seen.add(item.itemId);
                    }

                    for (const key of Array.from(transcriptCache.keys())) {
                        if (!seen.has(key)) {
                            transcriptCache.delete(key);
                        }
                    }

                    transcripts.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
                    set({ transcripts });
                };

                session.on("history_updated", historyHandler);

                if (session.history.length) {
                    historyHandler(session.history);
                }

                set({
                    isInitializing: false,
                    isAgentTyping: false,
                    connectionState: "connected",
                    lastError: null,
                });

                if (stream && payload.transport === "webrtc") {
                    transport.mute(false);
                    set({ microphoneState: "unmuted" });
                    await startAudioMonitor(stream, set);
                }
            };

            return {
                ...initialState,
                setConnectionState: (state) => set({ connectionState: state }),
                setTransport: (transport) => set({ transport }),
                setMicrophoneState: (state) => {
                    const handle = activeRealtimeHandle;
                    if (handle) {
                        try {
                            handle.transport.mute(state === "muted");
                        } catch (error) {
                            console.warn("Failed to toggle microphone state", error);
                        }
                    }

                    set({ microphoneState: state });
                },
                toggleCaptions: () => set((prev) => ({ captionsEnabled: !prev.captionsEnabled })),
                startSession: async (options) => {
                    if (get().isInitializing) {
                        return;
                    }

                    set({
                        isInitializing: true,
                        lastError: null,
                        sessionStartedAt: new Date().toISOString(),
                        transcripts: [],
                        summary: null,
                        summaryError: null,
                    });

                    try {
                        const payload = await bootstrapSession({
                            transport: options?.transport ?? get().transport,
                            locale: options?.locale ?? get().locale,
                            voice: options?.voice ?? get().voice,
                        });

                        set({
                            sessionId: payload.sessionId,
                            relaySessionId: payload.relaySessionId,
                            clientSecret: payload.clientSecret,
                            transport: payload.transport,
                            locale: payload.locale,
                            voice: payload.voice,
                            sessionConfig: payload.sessionConfig ?? null,
                            connectionState: payload.connectionState,
                        });

                        await connectRealtimeSession(payload);
                    } catch (error) {
                        const message = error instanceof Error ? error.message : "Failed to start realtime session";
                        set({
                            isInitializing: false,
                            connectionState: "disconnected",
                            lastError: message,
                        });
                        throw error;
                    }
                },
                endSession: async () => {
                    const state = get();
                    await closeSession(state.sessionId, state.relaySessionId);
                    await cleanupRealtimeSession();
                    set({
                        connectionState: "disconnected",
                        microphoneState: "muted",
                        isAgentTyping: false,
                    });
                },
                clearSession: () => {
                    void cleanupRealtimeSession();
                    set({
                        ...initialState,
                        transport: get().transport,
                        locale: get().locale,
                        voice: get().voice,
                    });
                },
                generateSummary: async () => {
                    const state = get();
                    if (!state.transcripts.length) {
                        set({ summaryError: "Talk with the companion before generating a summary." });
                        return null;
                    }

                    set({ summaryLoading: true, summaryError: null });

                    try {
                        const response = await fetch("/api/realtime/summary", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            credentials: "include",
                            body: JSON.stringify({ transcripts: state.transcripts }),
                        });

                        const payload = await response.json().catch(() => ({}));

                        if (!response.ok) {
                            throw new Error((payload as { error?: string }).error ?? "Failed to create summary");
                        }

                        const summary = (payload as { summary?: string }).summary ?? null;
                        set({ summary, summaryLoading: false });
                        return summary;
                    } catch (error) {
                        const message = error instanceof Error ? error.message : "Failed to create summary";
                        set({ summaryLoading: false, summaryError: message });
                        throw error;
                    }
                },
                persistSessionHistory: async (options) => {
                    const state = get();
                    if (!state.sessionId || state.transcripts.length === 0 || state.persistingHistory) {
                        return;
                    }

                    set({ persistingHistory: true, historyError: null });

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
                            historyId: result.historyId,
                            historyTotalCount: state.transcripts.length,
                        });
                    } catch (error) {
                        const message = error instanceof Error ? error.message : "Failed to persist history";
                        set({ persistingHistory: false, historyError: message });
                        throw error;
                    }
                },
                exportPersistedHistory: async (historyId) => {
                    const state = get();
                    const targetHistoryId = historyId ?? state.historyId ?? undefined;

                    try {
                        const record = await fetchHistorySnapshot(targetHistoryId);
                        if (!record) {
                            return null;
                        }

                        set({
                            transcripts: record.transcripts,
                            summary: record.summary,
                            historyId: record.historyId,
                            historyTotalCount: record.totalTranscriptCount ?? record.transcripts.length,
                            historyError: null,
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
                relayEvent: async (event) => {
                    const state = get();
                    if (!state.relaySessionId) {
                        return;
                    }

                    await fetch("/api/realtime/events", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        credentials: "include",
                        body: JSON.stringify({
                            sessionId: state.sessionId,
                            relaySessionId: state.relaySessionId,
                            event,
                        }),
                    }).catch(() => undefined);
                },
            };
        },
        {
            name: "realtime-session-store",
            partialize: (state) => ({
                summary: state.summary,
                summaryError: state.summaryError,
                historyId: state.historyId,
                historyTotalCount: state.historyTotalCount,
            }),
        }
    )
);