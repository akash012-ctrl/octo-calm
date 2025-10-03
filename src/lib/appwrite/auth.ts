import { ID, Models } from 'appwrite';
import { account } from './client';

export interface SignUpData {
    email: string;
    password: string;
    name: string;
}

export interface SignInData {
    email: string;
    password: string;
}

/**
 * Sign up a new user
 */
export async function signUp({ email, password, name }: SignUpData): Promise<Models.User<Models.Preferences>> {
    try {
        const user = await account.create(
            ID.unique(),
            email,
            password,
            name
        );

        // After creating account, automatically sign in
        await signIn({ email, password });

        return user;
    } catch (error) {
        console.error('Sign up error:', error);
        throw error;
    }
}

/**
 * Sign in an existing user
 */
export async function signIn({ email, password }: SignInData): Promise<Models.Session> {
    try {
        const session = await account.createEmailPasswordSession(email, password);
        return session;
    } catch (error) {
        console.error('Sign in error:', error);
        throw error;
    }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
    try {
        await account.deleteSession('current');
    } catch (error) {
        console.error('Sign out error:', error);
        throw error;
    }
}

/**
 * Get the currently authenticated user
 */
export async function getCurrentUser(): Promise<Models.User<Models.Preferences> | null> {
    try {
        const user = await account.get();
        return user;
    } catch {
        // User not authenticated
        return null;
    }
}

/**
 * Get the current session
 */
export async function getCurrentSession(): Promise<Models.Session | null> {
    try {
        const session = await account.getSession('current');
        return session;
    } catch {
        return null;
    }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
    const user = await getCurrentUser();
    return user !== null;
}
