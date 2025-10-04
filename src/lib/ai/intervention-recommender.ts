import type { InterventionRecommendation, InterventionType } from "@/types/intervention";
import type { MoodCheckIn } from "@/types/mood";
import type { MoodInferenceResult } from "./mood-inference";

export interface RecommendationContext {
    checkIns?: MoodCheckIn[];
    moodHistory?: MoodInferenceResult[];
    recentlyCompleted?: Array<{
        type: InterventionType;
        rating?: number;
        calmnessDelta?: number | null;
        completedAt: string;
    }>;
}

const INTERVENTION_LIBRARY: Record<InterventionType, Pick<InterventionRecommendation, "title" | "description" | "estimatedDuration">> = {
    breathing: {
        title: "Box Breathing (4x4x4x4)",
        description: "Guided breathing to regulate high arousal and panic cues.",
        estimatedDuration: 90,
    },
    meditation: {
        title: "Mindful Reset",
        description: "Short grounding meditation focused on sensory awareness.",
        estimatedDuration: 180,
    },
    journaling: {
        title: "Guided Reflection",
        description: "Prompt-based journaling to reframe anxious thoughts.",
        estimatedDuration: 300,
    },
    "physical-activity": {
        title: "Movement Break",
        description: "Gentle movement prompts to release stored tension.",
        estimatedDuration: 180,
    },
    grounding: {
        title: "5-4-3-2-1 Grounding",
        description: "Sensory grounding to bring attention back to the present.",
        estimatedDuration: 60,
    },
    "cognitive-reframing": {
        title: "Thought Reframe",
        description: "Quick exercise to challenge all-or-nothing thinking.",
        estimatedDuration: 180,
    },
    distraction: {
        title: "Gentle Distraction",
        description: "Light activities to shift focus when feeling overwhelmed.",
        estimatedDuration: 240,
    },
    "social-support": {
        title: "Reach Out",
        description: "Encouragement to connect with trusted support contact.",
        estimatedDuration: 120,
    },
};

const HINT_TO_INTERVENTION: Record<string, InterventionType[]> = {
    "grounding-breathing": ["breathing", "grounding"],
    "gentle-check-in": ["journaling", "grounding"],
    "self-compassion": ["cognitive-reframing", "meditation"],
    "reframe-cognitive": ["cognitive-reframing", "journaling"],
    "grounding-balance": ["grounding", "meditation"],
    "crisis-support": ["grounding", "social-support"],
};

function getLibraryEntry(type: InterventionType) {
    return INTERVENTION_LIBRARY[type] ?? {
        title: "Supportive Pause",
        description: "Take a brief pause guided by the companion.",
        estimatedDuration: 90,
    };
}

function computePriority(base: "low" | "medium" | "high", adjustment: number): "low" | "medium" | "high" {
    const levels: Array<"low" | "medium" | "high"> = ["low", "medium", "high"];
    const index = Math.min(2, Math.max(0, levels.indexOf(base) + adjustment));
    return levels[index];
}

function adjustPriorityForHistory(type: InterventionType, context: RecommendationContext): number {
    if (!context.recentlyCompleted?.length) {
        return 0;
    }

    const latest = context.recentlyCompleted.find((item) => item.type === type);
    if (!latest) {
        return 0;
    }

    if (latest.rating && latest.rating >= 4) {
        return 1;
    }

    if (typeof latest.calmnessDelta === "number" && latest.calmnessDelta < 0) {
        return -1;
    }

    return -0.5;
}

function pickInterventionTypes(result: MoodInferenceResult): InterventionType[] {
    const direct = result.interventionHints.flatMap((hint) => HINT_TO_INTERVENTION[hint] ?? []);

    if (direct.length) {
        return Array.from(new Set(direct));
    }

    if (result.sentiment === "negative" && result.arousal === "high") {
        return ["breathing", "grounding"];
    }

    if (result.sentiment === "negative" && result.arousal !== "high") {
        return ["grounding", "cognitive-reframing"];
    }

    if (result.sentiment === "neutral") {
        return ["journaling", "meditation"];
    }

    return ["meditation"];
}

function buildRecommendation(type: InterventionType, reasoning: string, priority: "low" | "medium" | "high"): InterventionRecommendation {
    const base = getLibraryEntry(type);
    return {
        type,
        title: base.title,
        description: base.description,
        estimatedDuration: base.estimatedDuration,
        reasoning,
        priority,
    };
}

const TYPE_BASE_REASON: Record<InterventionType, string> = {
    breathing: "Elevated arousal suggests breathing regulation.",
    grounding: "Grounding can stabilize mood swings noted in session.",
    "cognitive-reframing": "Reframing may help challenge rigid thought patterns.",
    journaling: "Journaling can surface nuanced feelings for processing.",
    meditation: "Mindfulness helps maintain balanced affect.",
    "social-support": "Encouraging connection with trusted support network.",
    "physical-activity": "Movement can release residual stress and tension.",
    distraction: "Light distraction offers relief when thoughts loop.",
};

function reasonForIntervention(type: InterventionType, result: MoodInferenceResult): string {
    if (result.crisisLikely) {
        return "Crisis cues detected; focusing on grounding and safety.";
    }

    if (result.patterns.length) {
        const dominant = result.patterns[0];
        return `Detected ${dominant.name.replace(/-/g, " ")} cues in conversation.`;
    }

    return TYPE_BASE_REASON[type] ?? "Supportive follow-up to sustain emotional balance.";
}

export function recommendInterventions(
    result: MoodInferenceResult | null,
    context: RecommendationContext = {}
): InterventionRecommendation[] {
    if (!result) {
        return fallbackRecommendations(context);
    }

    const types = pickInterventionTypes(result);
    const recommendations: InterventionRecommendation[] = [];

    types.forEach((type, index) => {
        const reasoning = reasonForIntervention(type, result);
        const historyAdjustment = adjustPriorityForHistory(type, context);
        const priority = computePriority(index === 0 ? "high" : "medium", historyAdjustment);
        recommendations.push(buildRecommendation(type, reasoning, priority));
    });

    return recommendations;
}

function fallbackRecommendations(context: RecommendationContext): InterventionRecommendation[] {
    const checkIns = context.checkIns ?? [];
    if (!checkIns.length) {
        return [
            buildRecommendation(
                "meditation",
                "Open the session with a mindful reset to ease into conversation.",
                "medium"
            ),
            buildRecommendation(
                "grounding",
                "Offer light grounding in case latent stress surfaces early.",
                "medium"
            ),
        ];
    }

    const latest = checkIns[0];
    const picks: { type: InterventionType; reasoning: string; priority: "low" | "medium" | "high" }[] = [];

    if (latest.crisisDetected) {
        picks.push({
            type: "social-support",
            reasoning: "Last check-in flagged crisis indicators; surface support pathways.",
            priority: "high",
        });
    }

    if (latest.mood <= 2 && latest.intensity >= 7) {
        picks.push({
            type: "breathing",
            reasoning: "Low mood with high intensity benefits from paced breathing.",
            priority: "high",
        });
    }

    if (latest.mood <= 3 && latest.intensity <= 6) {
        picks.push({
            type: "grounding",
            reasoning: "Grounding can ease lingering stress noted in recent check-ins.",
            priority: "medium",
        });
    }

    if (!picks.length) {
        picks.push({
            type: "journaling",
            reasoning: "Maintain positive momentum with a brief guided reflection.",
            priority: "low",
        });
    }

    return picks.map((item) => buildRecommendation(item.type, item.reasoning, item.priority));
}
