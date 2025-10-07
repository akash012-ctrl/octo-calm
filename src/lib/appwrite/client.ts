/**
 * Centralized Appwrite Client Configuration
 * 
 * This is the SINGLE source of truth for Appwrite clients in the application.
 * DO NOT create Client instances anywhere else.
 * 
 * Usage:
 * - Client Components: import { client, account, databases, storage } from "@/lib/appwrite/client"
 * - Server Components/API Routes: Use server.ts for admin operations
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
const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);

// Export singleton client instance
export { client };

// Export service instances (initialized once with the client)
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// Export database configuration
export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'octo_calm_db';

export const COLLECTION_IDS = {
    SESSION_HISTORY: process.env.NEXT_PUBLIC_APPWRITE_SESSION_HISTORY_COLLECTION_ID || 'session_history',
} as const;

export default client;
