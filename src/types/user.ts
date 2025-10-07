import { Models } from 'appwrite';

/**
 * User document stored in Appwrite database
 */
export interface UserDocument extends Models.Document {
    userId: string; // Reference to Appwrite auth user ID
    email: string;
    name: string;
    createdAt: string;
    updatedAt: string;
}

/**
 * User preferences document
 */
export interface UserPreferences extends Models.Document {
    userId: string;
    theme: 'light' | 'dark' | 'system';
    notificationsEnabled: boolean;
    emailNotifications: boolean;
    dataRetentionDays: number; // How long to keep mood/chat history
    createdAt: string;
    updatedAt: string;
}

/**
 * User's current state/session
 */
export interface UserState {
    user: Models.User<Models.Preferences> | null;
    userDocument: UserDocument | null;
    preferences: UserPreferences | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

/**
 * User profile for display purposes
 */
export interface UserProfile {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    joinedAt: string;
    lastActive?: string;
}
