import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import type { MoodCheckIn } from "@/types/mood";
import type { UserPreferences } from "@/types/user";
import type { TransportKind } from "./realtimeClient";

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

function extractSections(prompt: string): Record<string, string> {
    const sections: Record<string, string> = {};
    const pattern = /## \[([^\]]+)\]\s*\n([\s\S]*?)(?=\n## \[|$)/g;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(prompt)) !== null) {
        const key = match[1]?.trim();
        const body = match[2]?.trim();
        if (key && body) {
            sections[key] = body;
        }
    }

    return sections;
}

function computePersonaVersion(persona: string | null): string | null {
    if (!persona) {
        return null;
    }

    return createHash("sha1").update(persona).digest("hex").slice(0, 12);
}

function formatMoodDigest(locale: string, history: MoodCheckIn[]): { digest: string; guardrailFlags: string[] } {
    if (!history.length) {
        return {
            digest: "No prior mood history is available yet. Begin with a warm greeting and invite the user to share how they're feeling.",
            guardrailFlags: [],
        };
    }

    const sorted = history.slice().sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
    const mostRecent = sorted[0];
    const averageMood = sorted.reduce((sum, item) => sum + item.mood, 0) / sorted.length;
    const averageIntensity = sorted.reduce((sum, item) => sum + item.intensity, 0) / sorted.length;
    const crisisCount = sorted.filter((item) => item.crisisDetected).length;

    const recentNotes = sorted
        .slice(0, 3)
        .map((checkIn) => {
            const notes = checkIn.notes ? ` Notes: ${checkIn.notes}` : "";
            const triggers = checkIn.triggers?.length ? ` Triggers: ${checkIn.triggers.join(", ")}` : "";
            return `• ${new Date(checkIn.timestamp).toLocaleString(locale)} — Mood ${checkIn.mood} /5, intensity ${checkIn.intensity}.` + notes + triggers;
        })
        .join("\n");

    const trendDelta = sorted.length >= 2 ? mostRecent.mood - sorted[sorted.length - 1].mood : 0;
    const trendDescription = trendDelta > 0 ? "improving" : trendDelta < 0 ? "declining" : "stable";

    const guardrailDirectives: string[] = [];
    if (crisisCount > 0 || mostRecent.crisisDetected) {
        guardrailDirectives.push(
            "User has prior crisis indicators. Proactively check for safety within the first turn and offer crisis resources.",
        );
    }

    guardrailDirectives.push("If user expresses immediate danger or requests harm, escalate to human responders and share crisis resources promptly.");

    const digest = [
        `Most recent mood ${mostRecent.mood}/5 with intensity ${mostRecent.intensity}. Overall trend is ${trendDescription}.`,
        `Average mood ${averageMood.toFixed(1)}/5 and average intensity ${averageIntensity.toFixed(1)} across ${sorted.length} recent check-ins.`,
        recentNotes ? `Recent notes:\n${recentNotes}` : null,
    ]
        .filter(Boolean)
        .join("\n\n");

    return { digest, guardrailFlags: guardrailDirectives };
}

function summarizePreferences(preferences?: UserPreferences | null): string[] {
    if (!preferences) {
        return [];
    }

    const summary: string[] = [];

    if (preferences.aiPersonality) {
        const personalityDescriptions: Record<UserPreferences["aiPersonality"], string> = {
            calm: "Maintain a soft, unhurried cadence with longer pauses.",
            encouraging: "Offer motivating affirmations and upbeat encouragement.",
            professional: "Use precise, steady language similar to a trained counselor.",
            friendly: "Lean into warmth and approachable phrasing while staying respectful.",
        };
        summary.push(personalityDescriptions[preferences.aiPersonality]);
    }

    if (preferences.preferredInterventionTypes?.length) {
        summary.push(`Surface interventions the user tends to prefer: ${preferences.preferredInterventionTypes.join(", ")}.`);
    }

    if (preferences.moodReminderTime) {
        summary.push(`User prefers daily mood reminders around ${preferences.moodReminderTime}. Offer gentle follow-ups aligned with that schedule.`);
    }

    if (!preferences.notificationsEnabled) {
        summary.push("User has notifications off. Offer verbal reminders rather than push alerts.");
    }

    return summary;
}

function buildTransportGuidance(transport: TransportKind, voice: string): string {
    if (transport === "websocket") {
        return "Text-first delivery: respond with concise written messages, explicitly describe breathing cadence (e.g., 'inhale for four seconds'), and offer optional audio follow-up when the user is ready.";
    }

    return `Voice-first delivery using the '${voice}' voice. Keep turns under two sentences, include breathing or pacing cues verbally, and allow pauses for the user to respond.`;
}

export interface BuildRealtimeInstructionsOptions {
    locale: string;
    transport: TransportKind;
    voice: string;
    moodHistory: MoodCheckIn[];
    preferences?: UserPreferences | null;
}

export interface InstructionSection {
    title: string;
    body: string;
}

export interface RealtimeInstructionBundle {
    instructions: string;
    personaVersion: string | null;
    sections: InstructionSection[];
    guardrailDirectives: string[];
    preferenceSummary: string[];
    personalizationSummary: string;
}

export async function buildRealtimeInstructions(options: BuildRealtimeInstructionsOptions): Promise<RealtimeInstructionBundle> {
    const persona = await loadPersonaPrompt();
    const personaVersion = computePersonaVersion(persona);
    const personaSections = persona ? extractSections(persona) : {};

    const identityBlock = personaSections.CORE_IDENTITY ?? "You are Octo, a warm, non-judgmental mental wellness companion. Always follow Safety → Empathy → Clarity → Agency → Practical steps.";
    const toneBlock = personaSections.TONE_GUIDELINES ?? "Use gentle, steady language with short sentences. Reflect back what you hear and confirm understanding before moving on.";
    const interactionBlock = personaSections.INTERACTION_PRINCIPLES ?? "Always offer choice, adapt in realtime, and be comfortable with silence. Use octopus metaphors sparingly to reinforce multi-tentacle support.";
    const disclaimersBlock = personaSections.DISCLAIMERS_REQUIRED ?? "Remind users that you are not a medical professional and encourage professional support when risk persists.";
    const outputStyleBlock = personaSections.OUTPUT_STYLE_VOICE_FIRST ?? "Keep turns brief, conversational, reflective, and end with a question or clear next step.";

    const { digest: moodDigest, guardrailFlags } = formatMoodDigest(options.locale, options.moodHistory);
    const preferenceSummary = summarizePreferences(options.preferences);
    const transportGuidance = buildTransportGuidance(options.transport, options.voice);

    const guardrailDirectives = Array.from(new Set([...guardrailFlags, disclaimersBlock]));

    const sections: InstructionSection[] = [
        { title: "Identity & Priorities", body: `${identityBlock}\n\n${personaSections.PRIORITY_HIERARCHY ?? "Follow the priority hierarchy exactly as defined."}`.trim() },
        { title: "Tone & Cadence", body: `${toneBlock}\n\n${outputStyleBlock}`.trim() },
        { title: "Interaction Principles", body: interactionBlock },
        {
            title: "Personalization",
            body: [
                moodDigest,
                preferenceSummary.length ? `Preference highlights:\n- ${preferenceSummary.join("\n- ")}` : null,
            ]
                .filter(Boolean)
                .join("\n\n"),
        },
        { title: "Transport Guidance", body: transportGuidance },
        { title: "Safety & Guardrails", body: guardrailDirectives.map((line) => (line.startsWith("-") ? line : `- ${line}`)).join("\n") },
    ];

    const instructions = sections
        .map((section) => `### ${section.title}\n${section.body.trim()}`)
        .join("\n\n");

    return {
        instructions,
        personaVersion,
        sections,
        guardrailDirectives,
        preferenceSummary,
        personalizationSummary: moodDigest,
    };
}
