import { NextRequest } from "next/server";
import { Client, Account } from "node-appwrite";
import { Models } from "node-appwrite";

/**
 * Create an Appwrite client with session from request cookies
 */
function getClientFromRequest(request: NextRequest): Client {
    const client = new Client()
        .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
        .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

    // Get session cookie
    const sessionCookie = request.cookies.get(
        `a_session_${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`
    );

    if (sessionCookie) {
        client.setSession(sessionCookie.value);
    }

    return client;
}

/**
 * Get the current authenticated user from the API route
 * Uses session from cookies to verify user
 */
export async function getCurrentUserFromRequest(
    request: NextRequest
): Promise<Models.User<Models.Preferences> | null> {
    try {
        const client = getClientFromRequest(request);
        const account = new Account(client);
        const user = await account.get();
        return user;
    } catch (error) {
        console.error("Failed to get current user:", error);
        return null;
    }
}

/**
 * Get user ID from request or throw unauthorized error
 */
export async function requireAuth(request: NextRequest): Promise<string> {
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
        throw new Error("Unauthorized");
    }

    return user.$id;
}
