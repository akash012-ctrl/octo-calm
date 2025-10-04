import { randomUUID } from "crypto";

export interface RealtimeSessionConfig {
    voice?: string;
    instructions?: string;
    modalities?: string[];
    transport?: "webrtc" | "websocket";
}

export async function createRealtimeClientSecret(config: RealtimeSessionConfig = {}): Promise<{
    clientSecret: string | null;
    configuration: RealtimeSessionConfig;
}> {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_REALTIME_MODEL ?? "gpt-4o-realtime-preview";

    if (!apiKey) {
        return {
            clientSecret: null,
            configuration: config,
        };
    }

    try {
        const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model,
                voice: config.voice ?? "alloy",
                modalities: config.modalities ?? ["text", "audio"],
                instructions: config.instructions ?? undefined,
            }),
        });

        if (!response.ok) {
            const message = await response.text();
            console.warn("Failed to create realtime session secret:", message);
            return {
                clientSecret: null,
                configuration: config,
            };
        }

        const payload = (await response.json()) as {
            client_secret?: { value: string };
        };

        return {
            clientSecret: payload.client_secret?.value ?? null,
            configuration: config,
        };
    } catch (error) {
        console.error("Realtime secret creation failed:", error);
        return {
            clientSecret: null,
            configuration: config,
        };
    }
}

export function generateServerSessionId(): string {
    return randomUUID();
}
