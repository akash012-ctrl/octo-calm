import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";
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

function buildTransportGuidance(transport: TransportKind, voice: string): string {
    if (transport === "websocket") {
        return "Text transport: write in tight clinical notes, label speaker turns, and give explicit breathing counts.";
    }

    return `Voice transport with '${voice}' voice: speak in two short sentences, read summaries aloud, and leave a pause cue.`;
}

export interface BuildRealtimeInstructionsOptions {
    locale: string;
    transport: TransportKind;
    voice: string;
}

export interface InstructionSection {
    title: string;
    body: string;
}

export interface RealtimeInstructionBundle {
    instructions: string;
    personaVersion: string | null;
    sections: InstructionSection[];
}

export async function buildRealtimeInstructions(options: BuildRealtimeInstructionsOptions): Promise<RealtimeInstructionBundle> {
    const persona = await loadPersonaPrompt();
    const personaVersion = computePersonaVersion(persona);
    const personaSections = persona ? extractSections(persona) : {};

    const identityBlock = personaSections.CORE_IDENTITY ?? "You are a seasoned psychiatrist supporting U.S. veterans. Lead with safety, clarity, and grounded advice.";
    const priorityBlock = personaSections.PRIORITY_HIERARCHY ?? "1) Safety, 2) Stabilize, 3) Clarify, 4) Agency, 5) Next step.";
    const toneBlock = personaSections.TONE_GUIDELINES ?? "Speak calmly, use direct language, avoid jargon, and reflect back what you hear.";
    const flowBlock = personaSections.INTERACTION_PRINCIPLES ?? "Check safety, reflect concerns, offer one intervention, confirm consent, and log a short clinical note.";
    const safetyBlock = personaSections.DISCLAIMERS_REQUIRED ?? "Remind users you are not a replacement for urgent care and route to 988 or local services for crises.";
    const transportGuidance = buildTransportGuidance(options.transport, options.voice);

    const sections: InstructionSection[] = [
        { title: "Identity & Priorities", body: `${identityBlock}\n\n${priorityBlock}`.trim() },
        { title: "Tone & Delivery", body: toneBlock.trim() },
        { title: "Session Flow", body: flowBlock.trim() },
        { title: "Transport Guidance", body: transportGuidance.trim() },
        { title: "Safety Reminders", body: safetyBlock.trim() },
    ];

    const instructions = sections
        .map((section) => `### ${section.title}\n${section.body}`)
        .join("\n\n");

    return {
        instructions,
        personaVersion,
        sections,
    };
}
