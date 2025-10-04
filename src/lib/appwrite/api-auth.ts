/**
 * API Route Authentication Helpers
 * For use in Next.js API routes to authenticate requests
 */

import { NextRequest } from "next/server";
import { Client, Account, type Models } from "node-appwrite";

/**
 * Get Appwrite client configured with session from request cookies
 */
function getClientFromRequest(request: NextRequest): Client {
    const client = new Client()
        .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
        .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

    // Get session cookie
    const sessionCookieName = `a_session_${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`;
    const sessionCookie = request.cookies.get(sessionCookieName);

    if (sessionCookie?.value) {
        // Set the session on the client
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
    } catch {
        // User not authenticated or session invalid
        return null;
    }
}

/**
 * Require authentication in API route
 * Throws error if user is not authenticated
 * 
 * Usage:
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const userId = await requireAuth(request);
 *   // Your logic here...
 * }
 * ```
 */
export async function requireAuth(request: NextRequest): Promise<string> {
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
        throw new Error("Unauthorized");
    }

    return user.$id;
}
