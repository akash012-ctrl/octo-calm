import { MoodCategory, MoodIntensity } from './intervention';

/**
 * AI chat message
 */
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    metadata?: MessageMetadata;
}

/**
 * Message metadata for context
 */
export interface MessageMetadata {
    moodContext?: {
        mood: MoodCategory;
        intensity: MoodIntensity;
    };
    interventionSuggested?: boolean;
    crisisDetected?: boolean;
    sentiment?: 'positive' | 'neutral' | 'negative';
}

/**
 * AI prompt template
 */
export interface PromptTemplate {
    id: string;
    name: string;
    category: PromptCategory;
    template: string;
    variables: string[];
    systemPrompt?: string;
}

/**
 * Prompt categories
 */
export type PromptCategory =
    | 'mood-check-in'
    | 'crisis-support'
    | 'general-chat'
    | 'intervention-suggestion'
    | 'reflection'
    | 'goal-setting'
    | 'coping-strategies';

/**
 * AI conversation context
 */
export interface ConversationContext {
    userId: string;
    recentMoods: Array<{ mood: MoodCategory; intensity: MoodIntensity; timestamp: string }>;
    recentInterventions: string[];
    userPreferences: {
        aiPersonality: string;
        preferredInterventionTypes: string[];
    };
    conversationHistory: ChatMessage[];
    currentMood?: {
        mood: MoodCategory;
        intensity: MoodIntensity;
    };
}

/**
 * AI response with metadata
 */
export interface AIResponse {
    message: string;
    interventionRecommendations?: Array<{
        type: string;
        title: string;
        description: string;
        reasoning: string;
    }>;
    crisisDetected?: boolean;
    sentiment?: 'positive' | 'neutral' | 'negative';
    followUpSuggestions?: string[];
}

/**
 * Crisis detection result
 */
export interface CrisisDetection {
    detected: boolean;
    confidence: number; // 0-1
    keywords: string[];
    recommendedAction: 'immediate' | 'urgent' | 'monitor';
    resources: CrisisResource[];
}

/**
 * Crisis resource
 */
export interface CrisisResource {
    name: string;
    type: 'hotline' | 'text' | 'website' | 'app';
    contact: string;
    description: string;
    availability: string;
    country?: string;
}

/**
 * Journaling prompt with AI enhancement
 */
export interface AIJournalingPrompt {
    prompt: string;
    followUp: string[];
    category: 'gratitude' | 'reflection' | 'processing' | 'goal-setting';
    adaptedToMood: boolean;
}
