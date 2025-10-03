import { Client, Account, Databases, Storage } from 'appwrite';

// Appwrite configuration
const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '';

// Initialize Appwrite Client
const client = new Client();

client
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

// Export services
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export { client };

// Database and Collection IDs
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
