import { promises as fs } from "fs";
import path from "path";
import type { MoodCheckIn } from "@/types/mood";

let cachedPersonaPrompt: string | null = null;

async function loadPersonaPrompt(): Promise<string | null> {
    if (cachedPersonaPrompt !== null) {
        return cachedPersonaPrompt;
    }

    const promptPath = path.resolve(process.cwd(), ".github/prompts/01_SYSTEM_IDENTITY.md");
    try {
        const contents = await fs.readFile(promptPath, "utf8");
        cachedPersonaPrompt = contents.trim();
        return cachedPersonaPrompt;
    } catch (error) {
        console.warn("Unable to load system persona prompt:", error);
        cachedPersonaPrompt = null;
        return null;
    }
}

export async function buildRealtimeInstructions(locale: string, history: MoodCheckIn[]): Promise<string> {
    const persona = await loadPersonaPrompt();

    const recent = history.slice(0, 3);
    const summary = recent
        .map((checkIn) => {
            const notes = checkIn.notes ? ` Notes: ${checkIn.notes}` : "";
            return `• ${new Date(checkIn.timestamp).toLocaleString(locale)} — Mood ${checkIn.mood} (intensity ${checkIn.intensity}).${notes}`;
        })
        .join("\n");

    const personalization = recent.length
        ? `Recent mood history:\n${summary}`
        : "No prior mood history is available yet. Begin with an inviting warm greeting and an open question.";

    return [
        persona ?? "You are the Octo-Calm companion. Respond with empathy and evidence-based grounding techniques.",
        "Always speak in concise, supportive turns. Offer to breathe together when stress indicators rise.",
        "Escalate to safety resources if crisis markers are present and notify human responders as configured.",
        personalization,
    ].join("\n\n");
}
