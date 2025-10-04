import type { MoodCheckIn } from "@/types/mood";

export interface RecommendedIntervention {
    id: string;
    title: string;
    reason: string;
    priority: number;
}

export function recommendInterventionsFromMood(checkIns: MoodCheckIn[]): RecommendedIntervention[] {
    if (checkIns.length === 0) {
        return [];
    }

    const latest = checkIns[0];
    const intensity = latest.intensity;
    const moodValue = latest.mood;

    const interventions: RecommendedIntervention[] = [];

    if (moodValue <= 2 && intensity >= 7) {
        interventions.push({
            id: "breathing",
            title: "Guided breathing",
            reason: "Helps regulate high arousal during low mood moments",
            priority: 1,
        });
    }

    if (moodValue <= 3 && intensity <= 6) {
        interventions.push({
            id: "grounding",
            title: "Grounding 60s",
            reason: "Reconnect with the present to ease lingering stress",
            priority: interventions.length + 1,
        });
    }

    if (latest.crisisDetected) {
        interventions.unshift({
            id: "safety-plan",
            title: "Safety resources",
            reason: "Crisis indicators detected—review safety plan",
            priority: 0,
        });
    }

    if (interventions.length === 0) {
        interventions.push({
            id: "gratitude-reflection",
            title: "Gratitude reflection",
            reason: "Sustain positive momentum with a short reflection",
            priority: 2,
        });
    }

    return interventions;
}
