import type { GuardrailFlags, TranscriptItem } from "@/lib/stores/realtimeSessionStore";
import type { MoodCheckIn } from "@/types/mood";

export type Sentiment = "positive" | "neutral" | "negative";
export type ArousalLevel = "low" | "medium" | "high";

export interface MoodInferenceInput {
    transcripts: TranscriptItem[];
    audioEnergy?: number;
    backgroundNoiseLevel?: number;
    recentCheckIns?: MoodCheckIn[];
    guardrails?: GuardrailFlags;
    fallbackToEdgeModel?: boolean;
}

export interface MoodCue {
    term: string;
    polarity: "positive" | "negative" | "escalation";
    weight: number;
}

export interface MoodInferenceResult {
    sentiment: Sentiment;
    arousal: ArousalLevel;
    confidence: number;
    cues: MoodCue[];
    supportingTranscriptId: string;
    crisisLikely: boolean;
    recommendedAction: "monitor" | "de-escalate" | "escalate";
    patterns: PatternDetection[];
    explainabilityTags: ExplainabilityTag[];
    interventionHints: string[];
}

export interface PatternDetection {
    name: string;
    weight: number;
    evidence: string[];
}

export interface ExplainabilityTag {
    label: string;
    weight: number;
}

const POSITIVE_TERMS: MoodCue[] = [
    { term: "grateful", polarity: "positive", weight: 1.1 },
    { term: "hope", polarity: "positive", weight: 0.9 },
    { term: "calm", polarity: "positive", weight: 1 },
    { term: "better", polarity: "positive", weight: 0.8 },
    { term: "relaxed", polarity: "positive", weight: 1 },
    { term: "grounded", polarity: "positive", weight: 1 },
];

const NEGATIVE_TERMS: MoodCue[] = [
    { term: "anxious", polarity: "negative", weight: 1 },
    { term: "panic", polarity: "negative", weight: 1.2 },
    { term: "tired", polarity: "negative", weight: 0.7 },
    { term: "overwhelmed", polarity: "negative", weight: 1.2 },
    { term: "worried", polarity: "negative", weight: 1 },
    { term: "angry", polarity: "negative", weight: 0.9 },
    { term: "scared", polarity: "negative", weight: 1.1 },
    { term: "numb", polarity: "negative", weight: 0.8 },
];

const ESCALATION_TERMS: MoodCue[] = [
    { term: "end it", polarity: "escalation", weight: 2 },
    { term: "suicide", polarity: "escalation", weight: 2 },
    { term: "harm myself", polarity: "escalation", weight: 1.8 },
    { term: "give up", polarity: "escalation", weight: 1.4 },
    { term: "can't go on", polarity: "escalation", weight: 1.6 },
];

function normalise(text: string): string {
    return text
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z\s]/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
}

function accumulateCues(content: string): MoodCue[] {
    const catalogues: MoodCue[][] = [POSITIVE_TERMS, NEGATIVE_TERMS, ESCALATION_TERMS];
    return catalogues.flatMap((terms) => terms.filter((term) => content.includes(term.term)));
}

function computeScore(cues: MoodCue[]): number {
    return cues.reduce((score, cue) => {
        if (cue.polarity === "positive") {
            return score + cue.weight;
        }
        if (cue.polarity === "negative") {
            return score - cue.weight;
        }
        return score - cue.weight * 1.5;
    }, 0);
}

function adjustScoreWithCheckIns(score: number, checkIns?: MoodCheckIn[]): number {
    if (!checkIns?.length) {
        return score;
    }

    const recentAverage = checkIns.reduce((total, item) => total + item.mood, 0) / checkIns.length;
    const normalized = recentAverage - 3; // center around neutral mood (3)
    return score + normalized * 0.3;
}

const PATTERN_RULES: Array<{ name: string; phrases: string[]; weight: number }> = [
    {
        name: "catastrophizing",
        phrases: ["worst case", "everything will fall apart", "nothing will work"],
        weight: 1.1,
    },
    {
        name: "all-or-nothing",
        phrases: ["always", "never", "completely ruined", "total failure"],
        weight: 0.9,
    },
    {
        name: "self-blame",
        phrases: ["it's my fault", "i messed up", "i should have known"],
        weight: 0.8,
    },
    {
        name: "hopelessness",
        phrases: ["no way out", "can't go on", "there's no point"],
        weight: 1.3,
    },
];

const INTERVENTION_HINTS: Record<string, string> = {
    catastrophizing: "reframe-cognitive",
    "all-or-nothing": "grounding-balance",
    "self-blame": "self-compassion",
    hopelessness: "crisis-support",
};

const EXPLAINABILITY_BASE = [
    { label: "transcript", weight: 0.6 },
    { label: "audio-arousal", weight: 0.2 },
    { label: "history", weight: 0.2 },
];

function deriveArousalLevel(audioEnergy = 0, background = 0): ArousalLevel {
    const effectiveEnergy = Math.max(audioEnergy - background, 0);
    if (effectiveEnergy > 0.75) return "high";
    if (effectiveEnergy > 0.35) return "medium";
    return "low";
}

async function runEdgeInference(input: MoodInferenceInput, text: string): Promise<MoodCue[]> {
    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_MOOD_FUNCTION_ENDPOINT;
    const apiKey = process.env.APPWRITE_FUNCTION_MOOD_API_KEY;

    if (!endpoint || !apiKey) {
        return [];
    }

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Appwrite-Key": apiKey,
            },
            body: JSON.stringify({
                transcripts: input.transcripts,
                audioEnergy: input.audioEnergy,
                backgroundNoiseLevel: input.backgroundNoiseLevel,
                text,
            }),
        });

        if (!response.ok) {
            return [];
        }

        const payload = (await response.json()) as { cues?: MoodCue[] };
        return payload.cues ?? [];
    } catch (error) {
        console.warn("Edge mood inference failed", error);
        return [];
    }
}
async function combineCues(input: MoodInferenceInput, text: string): Promise<MoodCue[]> {
    let cues = accumulateCues(text);

    if (input.fallbackToEdgeModel) {
        const edgeCues = await runEdgeInference(input, text);
        if (edgeCues.length) {
            cues = cues.concat(edgeCues);
        }
    }

    return cues;
}

function detectPatterns(text: string): PatternDetection[] {
    return PATTERN_RULES.map((rule) => {
        const evidence = rule.phrases.filter((phrase) => text.includes(phrase));
        return evidence.length
            ? {
                name: rule.name,
                weight: rule.weight * evidence.length,
                evidence,
            }
            : null;
    }).filter(Boolean) as PatternDetection[];
}

function buildExplainabilityTags(patterns: PatternDetection[], cues: MoodCue[], arousal: ArousalLevel): ExplainabilityTag[] {
    const patternWeight = patterns.reduce((total, pattern) => total + pattern.weight, 0);
    const cueWeight = cues.length ? Math.min(cues.length * 0.1, 0.3) : 0;
    const arousalWeight = arousal === "high" ? 0.1 : 0.05;

    return [
        ...EXPLAINABILITY_BASE,
        { label: "patterns", weight: parseFloat(patternWeight.toFixed(2)) },
        { label: "lexical-cues", weight: parseFloat(cueWeight.toFixed(2)) },
        { label: "arousal", weight: parseFloat(arousalWeight.toFixed(2)) },
    ];
}

function deriveInterventionHints(patterns: PatternDetection[], crisisLikely: boolean, sentiment: Sentiment): string[] {
    if (crisisLikely) {
        return ["crisis-support"];
    }

    const hints = new Set<string>();
    patterns.forEach((pattern) => {
        const hint = INTERVENTION_HINTS[pattern.name];
        if (hint) {
            hints.add(hint);
        }
    });

    if (!hints.size) {
        if (sentiment === "negative") {
            hints.add("grounding-breathing");
        } else if (sentiment === "neutral") {
            hints.add("gentle-check-in");
        }
    }

    return Array.from(hints);
}

function deriveSentiment(score: number): Sentiment {
    if (score > 1.5) return "positive";
    if (score < -1.5) return "negative";
    return "neutral";
}

function computeConfidence(score: number, arousal: ArousalLevel): number {
    const base = 0.55 + Math.min(Math.abs(score), 4) * 0.08;
    const arousalBonus = arousal === "high" ? 0.08 : 0;
    return Math.min(0.95, base + arousalBonus);
}

function detectCrisis(cues: MoodCue[], guardrails?: GuardrailFlags): boolean {
    const crisisCueDetected = cues.some((cue) => cue.polarity === "escalation");
    const guardrailEscalation = Boolean(guardrails?.crisisDetected || guardrails?.escalationSuggested);
    return crisisCueDetected || guardrailEscalation;
}

function chooseRecommendedAction(sentiment: Sentiment, arousal: ArousalLevel, crisisLikely: boolean): MoodInferenceResult["recommendedAction"] {
    if (crisisLikely) return "escalate";
    if (sentiment === "negative" && arousal === "high") return "de-escalate";
    return "monitor";
}

function getLatestUserTranscript(transcripts: TranscriptItem[]): TranscriptItem | null {
    const userTurns = transcripts.filter((item) => item.speaker === "user");
    return userTurns.at(-1) ?? null;
}

export async function inferMood(input: MoodInferenceInput): Promise<MoodInferenceResult | null> {
    const latest = getLatestUserTranscript(input.transcripts);
    if (!latest) {
        return null;
    }

    const normalized = normalise(latest.content);
    const cues = await combineCues(input, normalized);
    const arousal = deriveArousalLevel(input.audioEnergy, input.backgroundNoiseLevel);
    const score = adjustScoreWithCheckIns(computeScore(cues), input.recentCheckIns);
    const sentiment = deriveSentiment(score);
    const confidence = computeConfidence(score, arousal);
    const crisisLikely = detectCrisis(cues, input.guardrails);
    const recommendedAction = chooseRecommendedAction(sentiment, arousal, crisisLikely);
    const patterns = detectPatterns(normalized);
    const explainabilityTags = buildExplainabilityTags(patterns, cues, arousal);
    const interventionHints = deriveInterventionHints(patterns, crisisLikely, sentiment);

    return {
        sentiment,
        arousal,
        confidence,
        cues,
        supportingTranscriptId: latest.id,
        crisisLikely,
        recommendedAction,
        patterns,
        explainabilityTags,
        interventionHints,
    };
}

function sentimentToNumeric(sentiment: Sentiment): number {
    if (sentiment === "positive") return 1;
    if (sentiment === "negative") return -1;
    return 0;
}

export function evaluateInferenceAgainstHistory(result: MoodInferenceResult | null, history: MoodInferenceResult[]): {
    trend: "improving" | "stable" | "declining";
    delta: number;
} {
    if (!result || history.length === 0) {
        return { trend: "stable", delta: 0 };
    }

    const last = history.at(-1)!;
    const delta = sentimentToNumeric(result.sentiment) - sentimentToNumeric(last.sentiment);
    const trend = delta > 0 ? "improving" : delta < 0 ? "declining" : "stable";

    return { trend, delta };
}

export function scoreEffectiveness(
    rating: number | null,
    calmnessDelta: number | null,
    moodTrendDelta: number
): number {
    const normalizedRating = rating !== null ? rating / 5 : 0.5;
    const calmnessScore = calmnessDelta !== null ? Math.max(Math.min(calmnessDelta / 10, 1), -1) : 0;
    return Number((normalizedRating * 0.6 + calmnessScore * 0.3 + moodTrendDelta * 0.1).toFixed(3));
}
