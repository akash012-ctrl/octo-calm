/**
 * Server-side Appwrite SDK with API Key
 * 
 * CRITICAL SECURITY RULES:
 * =======================
 * ✅ ONLY use in: Server Components, Server Actions, API Routes
 * ✅ Full database access with API key privileges
 * ✅ Can bypass document-level permissions for admin operations
 * ❌ NEVER import in Client Components (will expose API key!)
 * ❌ NEVER send raw server responses to client (sanitize first!)
 * 
 * This client is initialized ONCE using the singleton pattern.
 * The API key grants elevated privileges - handle with extreme care.
 * 
 * For client-side operations, use:
 * @see ./client.ts
 */

import { Client, Databases, Storage, Users } from 'node-appwrite';

// Strict environment variable validation
if (!process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT) {
    throw new Error('NEXT_PUBLIC_APPWRITE_ENDPOINT is not defined');
}

if (!process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID) {
    throw new Error('NEXT_PUBLIC_APPWRITE_PROJECT_ID is not defined');
}

if (!process.env.APPWRITE_API_KEY) {
    throw new Error('APPWRITE_API_KEY is not defined - required for server operations');
}

/**
 * Singleton Appwrite server client with API key
 * Initialized once and reused throughout server-side code
 */
let serverClientInstance: Client | null = null;

function getServerClientInstance(): Client {
    if (!serverClientInstance) {
        serverClientInstance = new Client()
            .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
            .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
            .setKey(process.env.APPWRITE_API_KEY!);
    }
    return serverClientInstance;
}

// Export singleton server client instance
export const serverClient = getServerClientInstance();

// Export service instances (initialized once with API key access)
export const databases = new Databases(serverClient);
export const storage = new Storage(serverClient);
export const users = new Users(serverClient);

// Export database and collection IDs
export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'octo_calm_db';

export const COLLECTION_IDS = {
    USERS: process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID || 'users',
    USER_PREFERENCES: process.env.NEXT_PUBLIC_APPWRITE_USER_PREFERENCES_COLLECTION_ID || 'user_preferences',
    MOOD_CHECKINS: process.env.NEXT_PUBLIC_APPWRITE_MOOD_CHECKINS_COLLECTION_ID || 'mood_checkins',
    INTERVENTION_SESSIONS: process.env.NEXT_PUBLIC_APPWRITE_INTERVENTION_SESSIONS_COLLECTION_ID || 'intervention_sessions',
    INTERVENTION_ANALYTICS: process.env.NEXT_PUBLIC_APPWRITE_INTERVENTION_ANALYTICS_COLLECTION_ID || 'intervention_analytics',
    JOURNAL_ENTRIES: process.env.NEXT_PUBLIC_APPWRITE_JOURNAL_ENTRIES_COLLECTION_ID || 'journal_entries',
    LEARNED_PATTERNS: process.env.NEXT_PUBLIC_APPWRITE_LEARNED_PATTERNS_COLLECTION_ID || 'learned_patterns',
    SAFETY_LOGS: process.env.NEXT_PUBLIC_APPWRITE_SAFETY_LOGS_COLLECTION_ID || 'safety_logs',
    PEER_POSTS: process.env.NEXT_PUBLIC_APPWRITE_PEER_POSTS_COLLECTION_ID || 'peer_posts',
    PEER_RESPONSES: process.env.NEXT_PUBLIC_APPWRITE_PEER_RESPONSES_COLLECTION_ID || 'peer_responses',
    SESSION_HISTORY: process.env.NEXT_PUBLIC_APPWRITE_SESSION_HISTORY_COLLECTION_ID || 'session_history',
} as const;
