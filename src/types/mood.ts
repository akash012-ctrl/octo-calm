/**
 * Mood Check-In Types
 */

export type MoodLevel = 1 | 2 | 3 | 4 | 5;

export interface MoodCheckIn {
    $id: string;
    userId: string;
    timestamp: string;
    mood: MoodLevel;
    intensity: number; // 1-10
    triggers?: string[];
    notes?: string;
    crisisDetected: boolean;
    sessionItemId?: string; // Reference to realtime session
    audioSummaryId?: string; // Reference to audio summary
    transcriptReference?: string; // Reference to transcript
    $createdAt: string;
    $updatedAt: string;
}

export interface MoodCheckInInput {
    mood: MoodLevel;
    intensity: number;
    triggers?: string[];
    notes?: string;
    sessionItemId?: string;
    audioSummaryId?: string;
    transcriptReference?: string;
}

export interface MoodTrend {
    date: string;
    mood: MoodLevel;
    intensity: number;
    averageMood: number;
}

export const COMMON_TRIGGERS = [
    "Work stress",
    "Relationship issues",
    "Financial worries",
    "Health concerns",
    "Social anxiety",
    "Loneliness",
    "Sleep problems",
    "Family conflict",
    "Academic pressure",
    "Major life change",
    "Loss or grief",
    "Other",
] as const;

export const GROUNDING_PROMPTS = [
    "Take a deep breath and look around you",
    "Name 5 things you can see right now",
    "Feel your feet on the ground",
    "Notice the temperature of the air",
    "Listen to the sounds around you",
] as const;
