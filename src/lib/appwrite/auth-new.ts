/**
 * Authentication Functions
 * Uses the centralized Appwrite client from client.ts
 */

import { ID, type Models } from 'appwrite';
import { account } from './client';

const SESSION_ENDPOINT = '/api/auth/session';

async function syncServerAuthSession(jwt?: string | null): Promise<void> {
    try {
        // If explicitly null, clear the cookie
        if (jwt === null) {
            await fetch(SESSION_ENDPOINT, {
                method: 'DELETE',
                credentials: 'include',
            });
            return;
        }

        let token = jwt ?? null;

        if (!token) {
            const jwtResponse = await account.createJWT();
            token = jwtResponse.jwt;
        }

        if (!token) {
            return;
        }

        await fetch(SESSION_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ jwt: token }),
        });
    } catch (error) {
        console.warn('Failed to sync server auth session:', error);
    }
}

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
 * Create a new user account
 * Based on Appwrite docs: account.create()
 */
export async function signUp({ email, password, name }: SignUpData): Promise<Models.User<Models.Preferences>> {
    try {
        // Create account
        const user = await account.create(
            ID.unique(),
            email,
            password,
            name
        );

        // Automatically sign in after creating account
        const session = await account.createEmailPasswordSession({
            email,
            password
        });

        if (session) {
            await syncServerAuthSession();
        }

        return user;
    } catch (error) {
        console.error('Sign up error:', error);
        throw error;
    }
}

/**
 * Sign in with email and password
 * Based on Appwrite docs: account.createEmailPasswordSession()
 */
export async function signIn({ email, password }: SignInData): Promise<Models.Session> {
    try {
        const session = await account.createEmailPasswordSession({
            email,
            password
        });
        if (session) {
            await syncServerAuthSession();
        }
        return session;
    } catch (error) {
        console.error('Sign in error:', error);
        throw error;
    }
}

/**
 * Sign out the current user
 * Based on Appwrite docs: account.deleteSession()
 */
export async function signOut(): Promise<void> {
    try {
        await account.deleteSession('current');
        await syncServerAuthSession(null);
    } catch (error) {
        console.error('Sign out error:', error);
        throw error;
    }
}

/**
 * Get the currently authenticated user
 * Based on Appwrite docs: account.get()
 */
export async function getCurrentUser(): Promise<Models.User<Models.Preferences> | null> {
    try {
        const user = await account.get();
        if (user) {
            await syncServerAuthSession();
        }
        return user;
    } catch {
        // User not authenticated
        await syncServerAuthSession(null);
        return null;
    }
}

/**
 * Get the current session
 * Based on Appwrite docs: account.getSession()
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
