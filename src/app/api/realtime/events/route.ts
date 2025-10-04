import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/appwrite/api-auth";

interface RelayPayload {
    sessionId: string;
    event: unknown;
}

export async function POST(request: NextRequest) {
    try {
        await requireAuth(request);

        const payload = (await request.json()) as RelayPayload;

        if (!payload?.sessionId || !payload.event) {
            return NextResponse.json({ error: "sessionId and event are required" }, { status: 400 });
        }

        const result = await attemptRelayToOpenAI(payload);

        return NextResponse.json({
            success: result.success,
            attempts: result.attempts,
            status: result.status,
            relayedAt: new Date().toISOString(),
            sessionId: payload.sessionId,
            eventType: typeof payload.event === "object" && payload.event !== null
                ? (payload.event as { type?: string }).type ?? null
                : null,
        });
    } catch (error) {
        console.error("Realtime event relay failed:", error);

        if (error instanceof Error && error.message === "Unauthorized") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        return NextResponse.json({ error: "Failed to relay event" }, { status: 500 });
    }
}

async function attemptRelayToOpenAI({ sessionId, event }: RelayPayload): Promise<{
    success: boolean;
    attempts: number;
    status: number | null;
}> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.warn("Realtime relay skipped: OPENAI_API_KEY is not configured");
        return {
            success: false,
            attempts: 0,
            status: null,
        };
    }

    const maxAttempts = 3;
    let attempt = 0;
    let lastStatus: number | null = null;

    while (attempt < maxAttempts) {
        attempt += 1;

        try {
            const response = await fetch(`https://api.openai.com/v1/realtime/sessions/${sessionId}/events`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(event),
            });

            lastStatus = response.status;

            if (response.ok) {
                console.info("Relayed realtime event", {
                    sessionId,
                    attempt,
                    status: response.status,
                });
                return {
                    success: true,
                    attempts: attempt,
                    status: response.status,
                };
            }

            const errorBody = await response.text();
            console.warn("Realtime relay attempt failed", {
                sessionId,
                attempt,
                status: response.status,
                body: errorBody,
            });
        } catch (error) {
            console.warn("OpenAI relay warning:", { sessionId, attempt, error });
        }

        if (attempt < maxAttempts) {
            const backoff = Math.min(500 * 2 ** (attempt - 1), 2000);
            await wait(backoff);
        }
    }

    return {
        success: false,
        attempts: attempt,
        status: lastStatus,
    };
}

async function wait(durationMs: number) {
    await new Promise((resolve) => setTimeout(resolve, durationMs));
}
