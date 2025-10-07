import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getCurrentUser } from "@/lib/appwrite/auth-new";
import { buildRealtimeInstructions } from "@/lib/ai/sessionPrompts";
import type { SessionHistoryTranscriptItem } from "@/types/realtime";

interface SummaryRequestBody {
    transcripts?: SessionHistoryTranscriptItem[];
}

const MAX_TRANSCRIPT_ITEMS = 24;
const DEFAULT_MODEL = process.env.OPENAI_SUMMARY_MODEL ?? "gpt-4o-mini";
const DEFAULT_LOCALE = "en-US";
const DEFAULT_VOICE = "alloy";

export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "Missing OpenAI credentials" }, { status: 503 });
        }

        const body = (await request.json().catch(() => ({}))) as SummaryRequestBody;
        const transcripts = Array.isArray(body.transcripts) ? body.transcripts : [];

        if (transcripts.length === 0) {
            return NextResponse.json({ error: "No transcripts provided" }, { status: 400 });
        }

        const trimmedTranscripts = transcripts
            .slice(-MAX_TRANSCRIPT_ITEMS)
            .map((item) => ({
                speaker: item.speaker,
                content: item.content,
                timestamp: item.timestamp,
            }));

        const instructionBundle = await buildRealtimeInstructions({
            locale: DEFAULT_LOCALE,
            transport: "webrtc",
            voice: DEFAULT_VOICE,
        });

        const promptDirectives = [
            "You are a collaborative psychiatrist summarizing a live voice session.",
            "Create a concise, clinician-style note using short bullet paragraphs.",
            "Prioritize mood, key stressors, coping strategies, safety signals, and agreed next steps.",
            "Keep the tone steady, supportive, and free of diagnoses.",
            "Annotate any high-risk cues with [!] inline.",
        ].join("\n");

        const dialogue = trimmedTranscripts
            .map((item) => `${item.speaker.toUpperCase()}: ${item.content}`)
            .join("\n");

        const openai = new OpenAI({ apiKey });
        const response = await openai.responses.create({
            model: DEFAULT_MODEL,
            input: [
                { role: "system", content: instructionBundle.instructions },
                { role: "system", content: promptDirectives },
                { role: "user", content: dialogue },
            ],
            max_output_tokens: 600,
        });

        const summary = response.output_text?.trim() ?? null;

        if (!summary) {
            return NextResponse.json({ error: "Failed to generate summary" }, { status: 502 });
        }

        return NextResponse.json({ summary });
    } catch (error) {
        console.error("Failed to create summary", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
