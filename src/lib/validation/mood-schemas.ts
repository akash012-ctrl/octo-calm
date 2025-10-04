import { z } from "zod";

/**
 * Mood Check-In Validation Schemas
 */

export const moodCheckInSchema = z.object({
    mood: z.number().min(1).max(5).int(),
    intensity: z.number().min(1).max(10).int(),
    triggers: z.array(z.string()).default([]),
    notes: z.string().max(1000).optional(),
    sessionItemId: z.string().optional(),
    audioSummaryId: z.string().optional(),
    transcriptReference: z.string().optional(),
});

export type MoodCheckInFormData = z.infer<typeof moodCheckInSchema>;

export const moodCheckInQuerySchema = z.object({
    range: z.enum(["7days", "30days", "90days", "all"]).optional().default("7days"),
    limit: z.number().min(1).max(100).optional().default(50),
    offset: z.number().min(0).optional().default(0),
});

export type MoodCheckInQuery = z.infer<typeof moodCheckInQuerySchema>;
