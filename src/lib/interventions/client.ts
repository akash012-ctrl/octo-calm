"use client";

interface StartInterventionRequest {
    interventionType: string;
    realtimeSessionId?: string | null;
    sessionItemId?: string | null;
    triggerMoodId?: string | null;
    notes?: string;
    context?: Record<string, unknown>;
}

export interface StartInterventionResponse {
    interventionSessionId: string;
    startedAt: string;
    interventionType: string;
    realtimeSessionId: string | null;
    agentInstructions?: string;
}

interface CompleteInterventionRequest {
    interventionSessionId: string;
    durationSeconds?: number;
    helpfulnessRating?: number | null;
    calmnessDelta?: number | null;
    feedback?: string;
    sessionItemId?: string | null;
    realtimeSessionId?: string | null;
    moodInference?: {
        sentiment?: "positive" | "neutral" | "negative";
        arousal?: "low" | "medium" | "high";
        recommendedAction?: string;
    } | null;
}

export interface CompleteInterventionResponse {
    interventionSessionId: string;
    completedAt: string;
    durationSeconds: number;
    helpfulnessRating: number | null;
    calmnessDelta: number | null;
    analytics: {
        moodDelta: number | null;
        effectivenessScore: number | null;
    } | null;
}

function toError(message: unknown): Error {
    if (message instanceof Error) return message;
    if (typeof message === "string") return new Error(message);
    return new Error("Unexpected error");
}

async function parseError(response: Response): Promise<Error> {
    try {
        const payload = (await response.json()) as { error?: string };
        return toError(payload?.error ?? response.statusText);
    } catch (error) {
        return toError(error);
    }
}

export async function startInterventionSession(
    payload: StartInterventionRequest
): Promise<StartInterventionResponse> {
    const response = await fetch("/api/interventions/start", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw await parseError(response);
    }

    const data = (await response.json()) as StartInterventionResponse;
    return {
        interventionSessionId: data.interventionSessionId,
        startedAt: data.startedAt,
        interventionType: data.interventionType,
        realtimeSessionId: data.realtimeSessionId ?? null,
        agentInstructions: data.agentInstructions,
    };
}

export async function completeInterventionSession(
    payload: CompleteInterventionRequest
): Promise<CompleteInterventionResponse> {
    const response = await fetch("/api/interventions/complete", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw await parseError(response);
    }

    const data = (await response.json()) as CompleteInterventionResponse;
    return {
        interventionSessionId: data.interventionSessionId,
        completedAt: data.completedAt,
        durationSeconds: data.durationSeconds,
        helpfulnessRating: data.helpfulnessRating,
        calmnessDelta: data.calmnessDelta,
        analytics: data.analytics ?? null,
    };
}
