import { randomUUID } from "crypto";

import {
    OpenAIRealtimeWebRTC,
    type OpenAIRealtimeWebRTCOptions,
    OpenAIRealtimeWebSocket,
    type OpenAIRealtimeWebSocketOptions,
    RealtimeAgent,
    type RealtimeAgentConfiguration,
    type RealtimeSessionOptions,
    type RealtimeSessionConnectOptions,
    type RealtimeSessionConfig,
    RealtimeSession,
    type RealtimeTransportLayer,
} from "@openai/agents-realtime";
import type { Tool } from "@openai/agents-core";

export type TransportKind = "webrtc" | "websocket";

export interface RealtimeClientSecretConfig {
    voice?: string;
    instructions?: string;
    modalities?: ("text" | "audio")[];
    transport?: TransportKind;
    model?: string;
    sessionConfig?: Partial<RealtimeSessionConfig>;
}

export interface RealtimeClientSecretResult {
    clientSecret: string | null;
    configuration: RealtimeClientSecretConfig;
}

const DEFAULT_REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL ?? "gpt-4o-realtime-preview";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, onTimeoutMessage: string): Promise<T> {
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
            reject(new Error(onTimeoutMessage));
        }, timeoutMs);
    });

    try {
        const result = await Promise.race([promise, timeoutPromise]);
        return result as T;
    } finally {
        if (timeoutHandle) {
            clearTimeout(timeoutHandle);
        }
    }
}

function computeBackoffDelay(baseDelayMs: number, attempt: number, jitterMs: number, maxDelayMs: number): number {
    const exponential = baseDelayMs * Math.pow(2, Math.max(attempt - 1, 0));
    const jitter = Math.random() * jitterMs;
    return Math.min(maxDelayMs, exponential + jitter);
}

function resolveModalities(transport: TransportKind | undefined, requested?: ("text" | "audio")[]): ("text" | "audio")[] {
    if (requested?.length) {
        return requested;
    }

    if (transport === "websocket") {
        return ["text"];
    }

    return ["audio", "text"];
}

function resolveSpeechSpeed(personality?: string): number {
    switch (personality) {
        case "calm":
            return 0.92;
        case "professional":
            return 1;
        case "encouraging":
        case "friendly":
            return 1.04;
        default:
            return 1;
    }
}

export async function createRealtimeClientSecret(config: RealtimeClientSecretConfig = {}): Promise<RealtimeClientSecretResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = config.model ?? DEFAULT_REALTIME_MODEL;
    const transport = config.transport ?? "webrtc";
    const modalities = resolveModalities(transport, config.modalities);
    const voice = config.voice ?? "alloy";

    if (!apiKey) {
        return {
            clientSecret: null,
            configuration: {
                ...config,
                model,
                transport,
                modalities,
                voice,
            },
        };
    }

    try {
        const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model,
                voice,
                modalities,
                instructions: config.instructions ?? undefined,
            }),
        });

        if (!response.ok) {
            const message = await response.text();
            console.warn("Failed to create realtime session secret:", message);
            return {
                clientSecret: null,
                configuration: {
                    ...config,
                    model,
                    transport,
                    modalities,
                    voice,
                },
            };
        }

        const payload = (await response.json()) as {
            client_secret?: { value: string };
        };

        return {
            clientSecret: payload.client_secret?.value ?? null,
            configuration: {
                ...config,
                model,
                transport,
                modalities,
                voice,
            },
        };
    } catch (error) {
        console.error("Realtime secret creation failed:", error);
        return {
            clientSecret: null,
            configuration: {
                ...config,
                model,
                transport,
                modalities,
                voice,
            },
        };
    }
}

export interface RealtimeAgentPersonaContext {
    personaVersion?: string | null;
    moodDigest?: string;
    preferenceSummary?: string[];
    guardrailDirectives?: string[];
}

export type CreateRealtimeAgentOptions<TContext = RealtimeAgentPersonaContext> =
    Omit<RealtimeAgentConfiguration<TContext>, "name"> & {
        name?: string;
        instructions: string;
        tools?: Tool<TContext>[];
    };

export function createRealtimeAgent<TContext = RealtimeAgentPersonaContext>(options: CreateRealtimeAgentOptions<TContext>): RealtimeAgent<TContext> {
    const { name, ...rest } = options;

    return new RealtimeAgent<TContext>({
        ...rest,
        name: name ?? "Octo-Calm Companion",
    });
}

export interface BuildSessionConfigurationOptions {
    instructions: string;
    voice: string;
    transport: TransportKind;
    model?: string;
    preferences?: { aiPersonality?: string } | null;
    personaVersion?: string | null;
    guardrailDirectives?: string[];
    preferenceSummary?: string[];
    moodDigest?: string;
    locale?: string;
    toolDefinitions?: RealtimeSessionConfig["tools"];
    modalities?: ("text" | "audio")[];
}

export function buildRealtimeSessionConfig(options: BuildSessionConfigurationOptions): Partial<RealtimeSessionConfig> {
    const model = options.model ?? DEFAULT_REALTIME_MODEL;
    const modalities = resolveModalities(options.transport, options.modalities);

    const audioConfig = options.transport === "websocket"
        ? undefined
        : {
            input: {
                format: { type: "audio/pcm" as const, rate: 16000 },
                transcription: {
                    language: options.locale?.split("-")[0],
                    model: "gpt-4o-mini-transcribe",
                },
                turnDetection: {
                    type: "server_vad",
                    createResponse: true,
                    interruptResponse: true,
                    silenceDurationMs: options.preferences?.aiPersonality === "calm" ? 900 : 600,
                },
                noiseReduction: { type: "near_field" as const },
            },
            output: {
                voice: options.voice,
                speed: resolveSpeechSpeed(options.preferences?.aiPersonality),
            },
        };

    return {
        model,
        instructions: options.instructions,
        toolChoice: "auto",
        tools: options.toolDefinitions ?? [],
        outputModalities: modalities,
        audio: audioConfig,
        voice: options.voice,
        providerData: {
            personaVersion: options.personaVersion,
            guardrailDirectives: options.guardrailDirectives,
            preferenceSummary: options.preferenceSummary,
            moodDigest: options.moodDigest,
            transport: options.transport,
        },
    } satisfies Partial<RealtimeSessionConfig>;
}

export interface RealtimeReconnectOptions {
    maxAttempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    jitterMs?: number;
    onAttempt?: (attempt: number, error: unknown) => void;
    onRecovered?: (attempt: number) => void;
}

export interface CreateRealtimeSessionOptions<TContext = RealtimeAgentPersonaContext> {
    agent: RealtimeAgent<TContext>;
    apiKey: string | (() => string | Promise<string>);
    model?: string;
    url?: string;
    transport?: TransportKind | RealtimeTransportLayer;
    sessionOptions?: Partial<RealtimeSessionOptions<TContext>>;
    reconnect?: RealtimeReconnectOptions;
    timeoutMs?: number;
}

export interface RealtimeSessionHandle<TContext = RealtimeAgentPersonaContext> {
    session: RealtimeSession<TContext>;
    transport: RealtimeTransportLayer;
    dispose: () => void;
}

function isTransportLayer(transport: unknown): transport is RealtimeTransportLayer {
    return Boolean(transport && typeof (transport as RealtimeTransportLayer).connect === "function");
}

function resolveTransportLayer(
    transport: CreateRealtimeSessionOptions["transport"],
    options: { model?: string; url?: string }
): RealtimeTransportLayer {
    if (isTransportLayer(transport)) {
        return transport;
    }

    if (transport === "websocket" || typeof window === "undefined") {
        const socketOptions: OpenAIRealtimeWebSocketOptions = {
            url: options.url,
        };
        return new OpenAIRealtimeWebSocket(socketOptions);
    }

    const rtcOptions: OpenAIRealtimeWebRTCOptions = {};
    return new OpenAIRealtimeWebRTC(rtcOptions);
}

async function connectWithRetry<TContext>(
    session: RealtimeSession<TContext>,
    connectOptions: RealtimeSessionConnectOptions,
    reconnectOptions: RealtimeReconnectOptions,
    timeoutMs: number
): Promise<void> {
    const maxAttempts = reconnectOptions.maxAttempts ?? 3;
    const baseDelayMs = reconnectOptions.baseDelayMs ?? 500;
    const jitterMs = reconnectOptions.jitterMs ?? 250;
    const maxDelayMs = reconnectOptions.maxDelayMs ?? 5000;

    let attempt = 0;
    let lastError: unknown = null;

    while (attempt < maxAttempts) {
        attempt += 1;
        try {
            await withTimeout(session.connect(connectOptions), timeoutMs, "Realtime session connection timeout");
            if (attempt > 1) {
                reconnectOptions.onRecovered?.(attempt);
            }
            return;
        } catch (error) {
            lastError = error;
            reconnectOptions.onAttempt?.(attempt, error);

            if (attempt >= maxAttempts) {
                throw error;
            }

            const delay = computeBackoffDelay(baseDelayMs, attempt, jitterMs, maxDelayMs);
            await wait(delay);
        }
    }

    throw lastError ?? new Error("Failed to connect realtime session");
}

export async function createRealtimeSession<TContext = RealtimeAgentPersonaContext>(
    options: CreateRealtimeSessionOptions<TContext>
): Promise<RealtimeSessionHandle<TContext>> {
    const transport = resolveTransportLayer(options.transport ?? "webrtc", {
        model: options.model,
        url: options.url,
    });

    const sessionOptions: Partial<RealtimeSessionOptions<TContext>> = {
        ...(options.sessionOptions ?? {}),
        transport,
    };

    const session = new RealtimeSession<TContext>(options.agent, sessionOptions);

    const connectOptions: RealtimeSessionConnectOptions = {
        apiKey: options.apiKey,
        model: options.model ?? DEFAULT_REALTIME_MODEL,
        url: options.url,
    };

    await connectWithRetry(session, connectOptions, options.reconnect ?? {}, options.timeoutMs ?? 15000);

    let reconnecting = false;
    const reconnectOptions = options.reconnect ?? {};

    const onConnectionChange = async (status: string) => {
        if (status !== "disconnected" || reconnecting || (reconnectOptions.maxAttempts ?? 0) <= 0) {
            return;
        }

        reconnecting = true;
        try {
            await connectWithRetry(session, connectOptions, reconnectOptions, options.timeoutMs ?? 15000);
        } catch (error) {
            reconnectOptions.onAttempt?.(reconnectOptions.maxAttempts ?? 0, error);
        } finally {
            reconnecting = false;
        }
    };

    transport.on("connection_change", onConnectionChange);

    return {
        session,
        transport,
        dispose: () => {
            transport.off("connection_change", onConnectionChange);
            transport.close();
            session.close();
        },
    };
}

export function generateServerSessionId(): string {
    return randomUUID();
}
