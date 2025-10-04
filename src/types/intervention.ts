import { Models } from 'appwrite';

/**
 * Mood intensity levels
 */
export type MoodIntensity = 1 | 2 | 3 | 4 | 5;

/**
 * Primary mood categories
 */
export type MoodCategory =
    | 'anxious'
    | 'sad'
    | 'stressed'
    | 'angry'
    | 'neutral'
    | 'content'
    | 'happy'
    | 'energetic';

/**
 * Mood check-in document
 */
export interface MoodEntry extends Models.Document {
    userId: string;
    mood: MoodCategory;
    intensity: MoodIntensity;
    notes?: string;
    triggers?: string[];
    activities?: string[];
    timestamp: string;
    createdAt: string;
}

/**
 * Intervention session document
 */
export interface InterventionSession extends Models.Document {
    userId: string;
    interventionType: InterventionType;
    durationSeconds: number; // Duration in seconds
    completed: boolean;
    rating?: number; // 1-5 rating of helpfulness
    notes?: string;
    triggerMoodId?: string; // Reference to mood entry that triggered this
    realtimeSessionId?: string | null;
    sessionItemId?: string | null;
    context?: Record<string, unknown> | null;
    calmnessDelta?: number | null;
    agentInstructions?: string | null;
    feedback?: string | null;
    startedAt: string;
    completedAt?: string;
    createdAt: string;
}

/**
 * Intervention types
 */
export type InterventionType =
    | 'breathing'
    | 'meditation'
    | 'journaling'
    | 'physical-activity'
    | 'grounding'
    | 'cognitive-reframing'
    | 'distraction'
    | 'social-support';

export interface InterventionAnalytics extends Models.Document {
    userId: string;
    interventionSessionId: string;
    interventionType: InterventionType;
    completedAt: string;
    moodDelta?: number | null;
    calmnessDelta?: number | null;
    helpfulnessRating?: number | null;
    sentimentScore?: number | null;
    arousalLevel?: 'low' | 'medium' | 'high' | null;
    recommendedAction?: string | null;
    sessionItemId?: string | null;
    effectivenessScore?: number | null;
}

/**
 * Breathing exercise configuration
 */
export interface BreathingExercise {
    id: string;
    name: string;
    description: string;
    pattern: {
        inhale: number; // seconds
        hold1: number; // seconds
        exhale: number; // seconds
        hold2: number; // seconds
    };
    cycles: number;
    duration: number; // total duration in seconds
}

/**
 * Meditation session configuration
 */
export interface MeditationSession {
    id: string;
    name: string;
    description: string;
    duration: number; // seconds
    audioUrl?: string;
    scriptSteps?: string[];
}

/**
 * Journaling prompt
 */
export interface JournalingPrompt {
    id: string;
    prompt: string;
    category: 'gratitude' | 'reflection' | 'processing' | 'goal-setting';
    difficulty: 'easy' | 'medium' | 'deep';
}

/**
 * Grounding exercise (5-4-3-2-1 technique, etc.)
 */
export interface GroundingExercise {
    id: string;
    name: string;
    description: string;
    steps: {
        instruction: string;
        count?: number;
    }[];
}

/**
 * Intervention recommendation from AI
 */
export interface InterventionRecommendation {
    type: InterventionType;
    title: string;
    description: string;
    estimatedDuration: number; // seconds
    reasoning: string; // Why this intervention was recommended
    priority: 'low' | 'medium' | 'high';
}

/**
 * Mood analytics data
 */
export interface MoodAnalytics {
    userId: string;
    period: 'week' | 'month' | 'quarter' | 'year';
    averageMood: number;
    moodDistribution: Record<MoodCategory, number>;
    mostCommonTriggers: string[];
    mostCommonActivities: string[];
    trends: {
        improving: boolean;
        stability: 'stable' | 'variable' | 'volatile';
    };
    generatedAt: string;
}
