import { NextRequest, NextResponse } from "next/server";
import { databases } from "@/lib/appwrite/server";
import { Query, ID } from "node-appwrite";
import { moodCheckInSchema, moodCheckInQuerySchema } from "@/lib/validation/mood-schemas";
import { requireAuth } from "@/lib/appwrite/api-auth";

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_MOOD_CHECKINS_COLLECTION_ID!;

/**
 * POST /api/checkins
 * Create a new mood check-in
 */
export async function POST(request: NextRequest) {
    try {
        // Get user ID from session
        const userId = await requireAuth(request);

        const body = await request.json();

        // Validate input
        const validationResult = moodCheckInSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                { error: "Invalid input", details: validationResult.error.issues },
                { status: 400 }
            );
        }

        const data = validationResult.data;

        // Create mood check-in document
        const document = await databases.createDocument(
            DATABASE_ID,
            COLLECTION_ID,
            ID.unique(),
            {
                userId,
                timestamp: new Date().toISOString(),
                mood: data.mood,
                intensity: data.intensity,
                triggers: data.triggers,
                notes: data.notes || "",
                crisisDetected: false, // Will be updated by mood inference engine
                sessionItemId: data.sessionItemId || "",
                audioSummaryId: data.audioSummaryId || "",
                transcriptReference: data.transcriptReference || "",
            }
        );

        // TODO: Trigger mood inference analysis
        // TODO: Check for crisis indicators
        // TODO: Send acknowledgement notification if needed

        return NextResponse.json({
            success: true,
            checkIn: document,
            acknowledgement: "Check-in saved successfully",
        });
    } catch (error) {
        console.error("Error creating check-in:", error);

        if (error instanceof Error && error.message === "Unauthorized") {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { error: "Failed to create check-in" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/checkins
 * Get user's check-in history
 */
export async function GET(request: NextRequest) {
    try {
        // Get user ID from session
        const userId = await requireAuth(request);

        // Parse query parameters
        const { searchParams } = new URL(request.url);
        const range = searchParams.get("range") || "7days";
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = parseInt(searchParams.get("offset") || "0");

        // Validate query parameters
        const queryValidation = moodCheckInQuerySchema.safeParse({
            range,
            limit,
            offset,
        });

        if (!queryValidation.success) {
            return NextResponse.json(
                { error: "Invalid query parameters", details: queryValidation.error.issues },
                { status: 400 }
            );
        }

        // Calculate date range
        const now = new Date();
        let startDate: Date;

        switch (range) {
            case "7days":
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case "30days":
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case "90days":
                startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            case "all":
            default:
                startDate = new Date(0); // Beginning of time
                break;
        }

        // Query check-ins
        const queries = [
            Query.equal("userId", userId),
            Query.greaterThanEqual("timestamp", startDate.toISOString()),
            Query.orderDesc("timestamp"),
            Query.limit(limit),
            Query.offset(offset),
        ];

        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_ID,
            queries
        );

        return NextResponse.json({
            checkIns: response.documents,
            total: response.total,
            hasMore: response.total > offset + limit,
        });
    } catch (error) {
        console.error("Error fetching check-ins:", error);

        if (error instanceof Error && error.message === "Unauthorized") {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { error: "Failed to fetch check-ins" },
            { status: 500 }
        );
    }
}
