import { z } from 'zod';

/**
 * Authentication schemas
 */
export const signUpSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name is too long'),
    email: z.string().email('Invalid email address'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

export const signInSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * Mood tracking schemas
 */
export const moodEntrySchema = z.object({
    mood: z.enum([
        'anxious',
        'sad',
        'stressed',
        'angry',
        'neutral',
        'content',
        'happy',
        'energetic',
    ]),
    intensity: z.number().min(1).max(5),
    notes: z.string().max(500, 'Notes are too long').optional(),
    triggers: z.array(z.string()).max(10, 'Too many triggers').optional(),
    activities: z.array(z.string()).max(10, 'Too many activities').optional(),
});

/**
 * Intervention schemas
 */
export const interventionSessionSchema = z.object({
    interventionType: z.enum([
        'breathing',
        'meditation',
        'journaling',
        'physical-activity',
        'grounding',
        'cognitive-reframing',
        'distraction',
        'social-support',
    ]),
    duration: z.number().min(0),
    completed: z.boolean(),
    rating: z.number().min(1).max(5).optional(),
    notes: z.string().max(500, 'Notes are too long').optional(),
    triggerMoodId: z.string().optional(),
});

/**
 * User preferences schemas
 */
export const userPreferencesSchema = z.object({
    theme: z.enum(['light', 'dark', 'system']),
    notificationsEnabled: z.boolean(),
    emailNotifications: z.boolean(),
    moodReminderTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    moodReminderFrequency: z.enum(['daily', 'twice-daily', 'weekly', 'disabled']),
    preferredInterventionTypes: z.array(
        z.enum([
            'breathing',
            'meditation',
            'journaling',
            'physical-activity',
            'grounding',
            'cognitive-reframing',
            'distraction',
            'social-support',
        ])
    ),
    aiPersonality: z.enum(['calm', 'encouraging', 'professional', 'friendly']),
    dataRetentionDays: z.number().min(7).max(365),
});

/**
 * Chat message schema
 */
export const chatMessageSchema = z.object({
    content: z.string().min(1, 'Message cannot be empty').max(2000, 'Message is too long'),
});

/**
 * Journaling entry schema
 */
export const journalingEntrySchema = z.object({
    content: z.string().min(10, 'Entry is too short').max(5000, 'Entry is too long'),
    prompt: z.string().optional(),
    mood: z.enum([
        'anxious',
        'sad',
        'stressed',
        'angry',
        'neutral',
        'content',
        'happy',
        'energetic',
    ]).optional(),
});

/**
 * Profile update schema
 */
export const profileUpdateSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name is too long'),
    email: z.string().email('Invalid email address'),
});

/**
 * Password change schema
 */
export const passwordChangeSchema = z.object({
    currentPassword: z.string().min(8, 'Password must be at least 8 characters'),
    newPassword: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

/**
 * Type exports
 */
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type SignInFormData = z.infer<typeof signInSchema>;
export type MoodEntryFormData = z.infer<typeof moodEntrySchema>;
export type InterventionSessionFormData = z.infer<typeof interventionSessionSchema>;
export type UserPreferencesFormData = z.infer<typeof userPreferencesSchema>;
export type ChatMessageFormData = z.infer<typeof chatMessageSchema>;
export type JournalingEntryFormData = z.infer<typeof journalingEntrySchema>;
export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;
export type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;
