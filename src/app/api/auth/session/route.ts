import { NextRequest, NextResponse } from "next/server";

const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

if (!PROJECT_ID) {
    throw new Error("NEXT_PUBLIC_APPWRITE_PROJECT_ID is required");
}

const JWT_COOKIE_NAME = `appwrite_jwt_${PROJECT_ID}`;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const jwt = typeof body?.jwt === "string" ? body.jwt.trim() : "";

        if (!jwt) {
            return NextResponse.json({ error: "JWT is required" }, { status: 400 });
        }

        const response = NextResponse.json({ success: true });
        response.cookies.set({
            name: JWT_COOKIE_NAME,
            value: jwt,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60, // 1 hour
        });

        return response;
    } catch (error) {
        console.error("Failed to persist Appwrite JWT:", error);
        return NextResponse.json({ error: "Failed to persist session" }, { status: 500 });
    }
}

export async function DELETE() {
    const response = NextResponse.json({ success: true });
    response.cookies.set({
        name: JWT_COOKIE_NAME,
        value: "",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
    });
    return response;
}
