import { NextRequest, NextResponse } from "next/server";
import { ID, Query } from "node-appwrite";
import { requireAuth } from "@/lib/appwrite/api-auth";
import { databases, DATABASE_ID, COLLECTION_IDS } from "@/lib/appwrite/server";
import { mapSessionHistoryDocument, type SessionHistoryDocument } from "@/lib/appwrite/sessionHistory";
import type { SessionHistoryRecord } from "@/types/realtime";

interface SessionHistoryBody {
    sessionId?: string;
    transcripts?: unknown[];
    guardrails?: unknown;
    summary?: string | null;
    durationMs?: number;
    startedAt?: string;
    endedAt?: string | null;
    transport?: "webrtc" | "websocket";
    locale?: string;
    voice?: string;
    metadata?: Record<string, unknown>;
}

const RECENT_TRANSCRIPT_LIMIT = 10;
const MAX_HISTORY_QUERY_LIMIT = 10;

function assertString(value: unknown, code: string) {
    if (typeof value !== "string" || value.length === 0) {
        throw new Error(code);
    }
}

function assertArray(value: unknown, code: string) {
    if (!Array.isArray(value)) {
        throw new Error(code);
    }
}

function assertOptionalNumber(value: unknown, code: string) {
    if (value !== undefined && typeof value !== "number") {
        throw new Error(code);
    }
}

function validateBody(body: SessionHistoryBody) {
    assertString(body.sessionId, "INVALID_SESSION_ID");
    assertArray(body.transcripts, "INVALID_TRANSCRIPTS");
    assertOptionalNumber(body.durationMs, "INVALID_DURATION");
}

function stringifyJson(value: unknown): string {
    try {
        return JSON.stringify(value ?? null);
    } catch (error) {
        console.warn("Failed to stringify history payload", error);
        return "null";
    }
}

function buildHistoryDocumentPayload(userId: string, body: SessionHistoryBody) {
    const metadataPayload = {
        ...(body.metadata ?? {}),
        summary: body.summary ?? null,
    } satisfies Record<string, unknown>;

    const document: Record<string, unknown> = {
        userId,
        transcripts: stringifyJson(body.transcripts ?? []),
        guardrails: stringifyJson(body.guardrails ?? null),
        metadata: stringifyJson(metadataPayload),
        durationMs: body.durationMs ?? null,
        startedAt: body.startedAt ?? null,
        endedAt: body.endedAt ?? null,
        transport: body.transport ?? null,
        locale: body.locale ?? null,
        voice: body.voice ?? null,
    };

    document.sessionId = body.sessionId ?? null;

    return document;
}

function parseJsonField<T>(raw: unknown, fallback: T): T {
    if (typeof raw === "string") {
        if (!raw.length) {
            return fallback;
        }
        try {
            return JSON.parse(raw) as T;
        } catch (error) {
            console.warn("Failed to parse history document field", error);
            return fallback;
        }
    }

    if (raw === null || raw === undefined) {
        return fallback;
    }

    return raw as T;
}

type SessionHistoryDocWithUser = SessionHistoryDocument & { userId: string };

function sanitizeHistoryDocument(doc: SessionHistoryDocWithUser): SessionHistoryRecord {
    const transcripts = parseJsonField<unknown[]>(doc.transcripts, []);
    const guardrails = parseJsonField<unknown>(doc.guardrails, null);
    const metadata = parseJsonField<Record<string, unknown>>(doc.metadata, {});
    return mapSessionHistoryDocument({
        ...doc,
        transcripts,
        guardrails,
        metadata,
    });
}

async function ensureHistoryOwnership(userId: string, historyId: string): Promise<SessionHistoryDocWithUser> {
    const existing = await databases.getDocument(
        DATABASE_ID,
        COLLECTION_IDS.SESSION_HISTORY,
        historyId
    ) as unknown as SessionHistoryDocWithUser;

    if (!existing || existing.userId !== userId) {
        throw new Error("FORBIDDEN");
    }
    return existing;
}

export async function POST(request: NextRequest) {
    try {
        const userId = await requireAuth(request);
        const body: SessionHistoryBody = await request.json().catch(() => ({}));
        validateBody(body);

        const doc = await databases.createDocument(
            DATABASE_ID,
            COLLECTION_IDS.SESSION_HISTORY,
            ID.unique(),
            buildHistoryDocumentPayload(userId, body)
        ) as unknown as SessionHistoryDocWithUser;

        return NextResponse.json({
            historyId: doc.$id,
            sessionId: doc.sessionId ?? null,
            storedAt: doc.$createdAt,
        });
    } catch (error) {
        if (error instanceof Error) {
            switch (error.message) {
                case "Unauthorized":
                    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
                case "INVALID_SESSION_ID":
                    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
                case "INVALID_TRANSCRIPTS":
                    return NextResponse.json({ error: "transcripts must be an array" }, { status: 400 });
                case "INVALID_DURATION":
                    return NextResponse.json({ error: "durationMs must be a number" }, { status: 400 });
                default:
                    break;
            }
        }

        console.error("Failed to persist realtime history", error);
        return NextResponse.json({ error: "Failed to persist history" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const userId = await requireAuth(request);
        const body = (await request.json().catch(() => ({}))) as SessionHistoryBody & { historyId?: string };

        assertString(body.historyId, "INVALID_HISTORY_ID");
        validateBody(body);

        await ensureHistoryOwnership(userId, body.historyId!);

        const doc = await databases.updateDocument(
            DATABASE_ID,
            COLLECTION_IDS.SESSION_HISTORY,
            body.historyId!,
            buildHistoryDocumentPayload(userId, body)
        ) as unknown as SessionHistoryDocWithUser;

        return NextResponse.json({
            historyId: doc.$id,
            sessionId: doc.sessionId ?? null,
            storedAt: doc.$updatedAt,
        });
    } catch (error) {
        if (error instanceof Error) {
            switch (error.message) {
                case "Unauthorized":
                    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
                case "INVALID_HISTORY_ID":
                    return NextResponse.json({ error: "historyId is required" }, { status: 400 });
                case "INVALID_SESSION_ID":
                    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
                case "INVALID_TRANSCRIPTS":
                    return NextResponse.json({ error: "transcripts must be an array" }, { status: 400 });
                case "INVALID_DURATION":
                    return NextResponse.json({ error: "durationMs must be a number" }, { status: 400 });
                case "FORBIDDEN":
                    return NextResponse.json({ error: "Not found" }, { status: 404 });
                default:
                    break;
            }
        }

        console.error("Failed to update realtime history", error);
        return NextResponse.json({ error: "Failed to update history" }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const userId = await requireAuth(request);
        const { searchParams } = new URL(request.url);
        const historyId = searchParams.get("historyId");
        const limit = Math.min(Number.parseInt(searchParams.get("limit") ?? "3", 10) || 3, MAX_HISTORY_QUERY_LIMIT);

        if (historyId) {
            const doc = await ensureHistoryOwnership(userId, historyId);
            return NextResponse.json(sanitizeHistoryDocument(doc));
        }

        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_IDS.SESSION_HISTORY,
            [
                Query.equal("userId", userId),
                Query.orderDesc("endedAt"),
                Query.orderDesc("$createdAt"),
                Query.limit(limit),
            ]
        );

        const documents = response.documents as unknown as SessionHistoryDocWithUser[];

        const histories = documents.map((doc) => {
            const sanitized = sanitizeHistoryDocument(doc);
            const transcripts = Array.isArray(sanitized.transcripts) ? sanitized.transcripts : [];
            const recentTranscripts = transcripts.slice(-RECENT_TRANSCRIPT_LIMIT);
            return {
                ...sanitized,
                transcripts: recentTranscripts,
                totalTranscriptCount: transcripts.length,
            };
        });

        return NextResponse.json({ histories });
    } catch (error) {
        if (error instanceof Error && error.message === "Unauthorized") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        console.error("Failed to load realtime history", error);
        return NextResponse.json({ error: "Failed to load history" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const userId = await requireAuth(request);
        const body = (await request.json().catch(() => ({}))) as { historyId?: string; purgeAll?: boolean };

        if (body.historyId) {
            await ensureHistoryOwnership(userId, body.historyId);
            await databases.deleteDocument(DATABASE_ID, COLLECTION_IDS.SESSION_HISTORY, body.historyId);
            return NextResponse.json({ deleted: [body.historyId] });
        }

        if (body.purgeAll) {
            const response = await databases.listDocuments(
                DATABASE_ID,
                COLLECTION_IDS.SESSION_HISTORY,
                [
                    Query.equal("userId", userId),
                    Query.limit(MAX_HISTORY_QUERY_LIMIT),
                ]
            );

            const deleted: string[] = [];
            for (const doc of response.documents) {
                await databases.deleteDocument(DATABASE_ID, COLLECTION_IDS.SESSION_HISTORY, doc.$id);
                deleted.push(doc.$id);
            }

            return NextResponse.json({ deleted });
        }

        return NextResponse.json({ error: "historyId or purgeAll flag required" }, { status: 400 });
    } catch (error) {
        if (error instanceof Error) {
            switch (error.message) {
                case "Unauthorized":
                    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
                case "FORBIDDEN":
                    return NextResponse.json({ error: "Not found" }, { status: 404 });
                default:
                    break;
            }
        }

        console.error("Failed to delete realtime history", error);
        return NextResponse.json({ error: "Failed to delete history" }, { status: 500 });
    }
}
