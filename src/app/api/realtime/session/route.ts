import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/appwrite/api-auth";
import { buildRealtimeSessionConfig, createRealtimeClientSecret, generateServerSessionId } from "@/lib/ai/realtimeClient";
import { buildRealtimeInstructions } from "@/lib/ai/sessionPrompts";

interface SessionRequestBody {
    transport?: "webrtc" | "websocket";
    locale?: string;
    voice?: string;
}

interface BootstrapContext {
    transport: "webrtc" | "websocket";
    locale: string;
    voice: string;
}

async function assembleSessionBootstrap(context: BootstrapContext) {
    const { transport, locale, voice } = context;
    const instructionBundle = await buildRealtimeInstructions({
        locale,
        transport,
        voice,
    });

    const outputModalities: ("text" | "audio")[] = transport === "websocket" ? ["text"] : ["audio", "text"];
    const sessionConfig = buildRealtimeSessionConfig({
        instructions: instructionBundle.instructions,
        voice,
        transport,
        model: process.env.OPENAI_REALTIME_MODEL,
        personaVersion: instructionBundle.personaVersion,
        locale,
        modalities: outputModalities,
    });

    const { clientSecret, sessionId: relaySessionId } = await createRealtimeClientSecret({
        voice,
        instructions: instructionBundle.instructions,
        transport,
        modalities: outputModalities,
        model: sessionConfig.model,
        sessionConfig,
    });

    return {
        sessionId: generateServerSessionId(),
        clientSecret,
        transport,
        locale,
        voice,
        connectionState: "connecting" as const,
        instructionMeta: {
            personaVersion: instructionBundle.personaVersion,
            sections: instructionBundle.sections,
        },
        sessionConfig,
        relaySessionId,
    };
}

export async function POST(request: NextRequest) {
    try {
        await requireAuth(request);
        const body: SessionRequestBody = await request.json().catch(() => ({}));

        const transport = body.transport === "websocket" ? "websocket" : "webrtc";
        const locale = body.locale ?? "en-US";
        const voice = body.voice ?? "alloy";

        const payload = await assembleSessionBootstrap({ transport, locale, voice });

        return NextResponse.json(payload);
    } catch (error) {
        console.error("Failed to bootstrap realtime session:", error);

        if (error instanceof Error && error.message === "Unauthorized") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        return NextResponse.json({ error: "Failed to bootstrap session" }, { status: 500 });
    }
}

