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

    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
    const sessionCookieName = `a_session_${projectId}`;
    const jwtCookieName = `appwrite_jwt_${projectId}`;

    const sessionCookie = request.cookies.get(sessionCookieName);
    const authHeader = request.headers.get("authorization");
    const bearerToken = authHeader?.toLowerCase().startsWith("bearer ")
        ? authHeader.slice(7).trim()
        : null;
    const jwtCookie = request.cookies.get(jwtCookieName);

    if (sessionCookie?.value) {
        client.setSession(sessionCookie.value);
    } else if (bearerToken) {
        client.setJWT(bearerToken);
    } else if (jwtCookie?.value) {
        client.setJWT(jwtCookie.value);
    }

    return client;
}


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


export async function requireAuth(request: NextRequest): Promise<string> {
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
        throw new Error("Unauthorized");
    }

    return user.$id;
}
