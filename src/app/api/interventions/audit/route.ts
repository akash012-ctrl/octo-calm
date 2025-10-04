import { NextRequest, NextResponse } from "next/server";
import { ID, Permission, Role } from "node-appwrite";
import { requireAuth } from "@/lib/appwrite/api-auth";
import { databases, DATABASE_ID, COLLECTION_IDS } from "@/lib/appwrite/server";

const DISABLED_ERROR = { error: "Audit endpoint is disabled in production" } as const;

function validatePermissions(permissions: string[] | undefined, userId: string): boolean {
    if (!permissions?.length) {
        return false;
    }

    const required = [
        `user:${userId}`,
        `user:${userId}/read`,
        `user:${userId}/update`,
        `user:${userId}/delete`,
        `user:${userId}/write`,
    ];

    return required.every((scope) => permissions.some((permission) => permission.includes(scope)));
}

export async function POST(request: NextRequest) {
    if (process.env.NODE_ENV === "production") {
        return NextResponse.json(DISABLED_ERROR, { status: 403 });
    }

    let createdDocumentId: string | null = null;

    try {
        const userId = await requireAuth(request);
        const collection = await databases.getCollection(DATABASE_ID, COLLECTION_IDS.INTERVENTION_SESSIONS);
        const now = new Date().toISOString();

        const document = await databases.createDocument(
            DATABASE_ID,
            COLLECTION_IDS.INTERVENTION_SESSIONS,
            ID.unique(),
            {
                userId,
                interventionType: "grounding",
                startedAt: now,
                completed: false,
                durationSeconds: 0,
            },
            [
                Permission.read(Role.user(userId)),
                Permission.update(Role.user(userId)),
                Permission.delete(Role.user(userId)),
                Permission.write(Role.user(userId)),
            ]
        );

        createdDocumentId = document.$id;

        const update = await databases.updateDocument(
            DATABASE_ID,
            COLLECTION_IDS.INTERVENTION_SESSIONS,
            document.$id,
            {
                completed: true,
                completedAt: now,
            }
        );

        await databases.deleteDocument(DATABASE_ID, COLLECTION_IDS.INTERVENTION_SESSIONS, document.$id);

        const permissionsValid = validatePermissions(document.$permissions, userId) && validatePermissions(update.$permissions, userId);

        return NextResponse.json({
            collectionId: collection.$id,
            documentSecurity: collection.documentSecurity ?? false,
            tests: {
                create: true,
                update: update.completed === true,
                cleanup: true,
                permissions: permissionsValid,
            },
        });
    } catch (error) {
        console.error("Intervention collection audit failed", error);
        if (createdDocumentId) {
            try {
                await databases.deleteDocument(DATABASE_ID, COLLECTION_IDS.INTERVENTION_SESSIONS, createdDocumentId);
            } catch (cleanupError) {
                console.warn("Failed to cleanup audit document", cleanupError);
            }
        }

        if (error instanceof Error && error.message === "Unauthorized") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        return NextResponse.json({ error: "Audit failed" }, { status: 500 });
    }
}
