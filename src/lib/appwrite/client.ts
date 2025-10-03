/**
 * Client-side Appwrite SDK
 * 
 * SECURITY GUIDELINES:
 * ==================
 * ✅ SAFE: Use in Client Components for user-facing features
 * ✅ SAFE: Only uses NEXT_PUBLIC_* environment variables
 * ❌ NEVER: Include API keys or server-side secrets
 * ❌ NEVER: Access sensitive user data directly
 * 
 * This client is initialized ONCE using the singleton pattern.
 * Always import from this file - never create new Client instances.
 * 
 * For server-side operations with elevated privileges, use:
 * @see ./server.ts
 */

import { Client, Account, Databases, Storage } from 'appwrite';

// Validate required environment variables
if (!process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT) {
    throw new Error('NEXT_PUBLIC_APPWRITE_ENDPOINT is required');
}

if (!process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID) {
    throw new Error('NEXT_PUBLIC_APPWRITE_PROJECT_ID is required');
}

/**
 * Singleton Appwrite client for browser use
 * Initialized once and reused throughout the application
 */
let clientInstance: Client | null = null;

function getClientInstance(): Client {
    if (!clientInstance) {
        clientInstance = new Client()
            .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
            .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);
    }
    return clientInstance;
}

// Export singleton client instance
export const client = getClientInstance();

// Export service instances (initialized once)
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// Database and Collection IDs (safe to expose as NEXT_PUBLIC_*)
export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'octo_calm_db';

export const COLLECTION_IDS = {
    USERS: process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID || 'users',
    USER_PREFERENCES: process.env.NEXT_PUBLIC_APPWRITE_USER_PREFERENCES_COLLECTION_ID || 'user_preferences',
    MOOD_CHECKINS: process.env.NEXT_PUBLIC_APPWRITE_MOOD_CHECKINS_COLLECTION_ID || 'mood_checkins',
    INTERVENTION_SESSIONS: process.env.NEXT_PUBLIC_APPWRITE_INTERVENTION_SESSIONS_COLLECTION_ID || 'intervention_sessions',
    JOURNAL_ENTRIES: process.env.NEXT_PUBLIC_APPWRITE_JOURNAL_ENTRIES_COLLECTION_ID || 'journal_entries',
    LEARNED_PATTERNS: process.env.NEXT_PUBLIC_APPWRITE_LEARNED_PATTERNS_COLLECTION_ID || 'learned_patterns',
    SAFETY_LOGS: process.env.NEXT_PUBLIC_APPWRITE_SAFETY_LOGS_COLLECTION_ID || 'safety_logs',
    PEER_POSTS: process.env.NEXT_PUBLIC_APPWRITE_PEER_POSTS_COLLECTION_ID || 'peer_posts',
    PEER_RESPONSES: process.env.NEXT_PUBLIC_APPWRITE_PEER_RESPONSES_COLLECTION_ID || 'peer_responses',
} as const;

export default client;
