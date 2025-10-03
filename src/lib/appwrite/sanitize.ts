/**
 * Data Sanitization Utilities
 * 
 * These utilities ensure that sensitive data is NEVER sent to the client.
 * Always sanitize server-side data before returning it to Client Components.
 * 
 * SECURITY RULES:
 * ==============
 * 1. Remove internal IDs and metadata
 * 2. Strip Appwrite system fields ($id, $permissions, etc.)
 * 3. Redact sensitive personal information
 * 4. Remove admin-only fields
 * 5. Validate data structure before sending
 */

import { Models } from 'appwrite';

/**
 * Sensitive fields that should NEVER be exposed to the client
 */
const SENSITIVE_FIELDS = [
    '$permissions',
    '$databaseId',
    '$collectionId',
    'password',
    'passwordHash',
    'apiKey',
    'secretKey',
    'internalNotes',
    'adminNotes',
] as const;

/**
 * System fields to remove (Appwrite internal metadata)
 */
const SYSTEM_FIELDS = [
    '$createdAt',
    '$updatedAt',
] as const;

/**
 * Generic type for sanitized data (removes Appwrite Models wrapper)
 */
export type SanitizedData<T> = Omit<T, typeof SENSITIVE_FIELDS[number] | typeof SYSTEM_FIELDS[number]>;

/**
 * Remove sensitive and system fields from an object
 */
export function sanitizeObject<T extends Record<string, unknown>>(
    data: T,
    options: {
        keepSystemFields?: boolean;
        additionalSensitiveFields?: string[];
    } = {}
): Partial<T> {
    const fieldsToRemove = [
        ...SENSITIVE_FIELDS,
        ...(options.keepSystemFields ? [] : SYSTEM_FIELDS),
        ...(options.additionalSensitiveFields || []),
    ];

    const sanitized: Partial<T> = {};

    for (const key in data) {
        if (!fieldsToRemove.includes(key as string)) {
            sanitized[key] = data[key];
        }
    }

    return sanitized;
}

/**
 * Sanitize an array of objects
 */
export function sanitizeArray<T extends Record<string, unknown>>(
    data: T[],
    options?: Parameters<typeof sanitizeObject>[1]
): Partial<T>[] {
    return data.map(item => sanitizeObject(item, options));
}

/**
 * Sanitize user data for client consumption
 * Removes sensitive fields and ensures only safe data is exposed
 */
export function sanitizeUser(user: Models.User<Models.Preferences>) {
    return {
        $id: user.$id,
        name: user.name,
        email: user.email,
        // Only include safe preferences
        prefs: user.prefs ? sanitizeObject(user.prefs) : {},
        // DO NOT include: phone, passwordUpdate, emailVerification, phoneVerification, etc.
    };
}

/**
 * Sanitize session data for client
 * Only exposes necessary session information
 */
export function sanitizeSession(session: Models.Session) {
    return {
        $id: session.$id,
        userId: session.userId,
        expire: session.expire,
        provider: session.provider,
        // DO NOT include: secret, providerAccessToken, etc.
    };
}

/**
 * Sanitize document data from database
 * Removes Appwrite metadata and sensitive fields
 */
export function sanitizeDocument<T extends Models.Document>(
    document: T,
    options?: {
        includeId?: boolean;
        additionalSensitiveFields?: string[];
    }
): Partial<T> {
    const { includeId = true, additionalSensitiveFields = [] } = options || {};

    const sanitized = sanitizeObject(document, {
        keepSystemFields: false,
        additionalSensitiveFields,
    });

    // Always include document ID for client-side reference
    if (includeId && document.$id) {
        (sanitized as Record<string, unknown>).$id = document.$id;
    }

    return sanitized;
}

/**
 * Sanitize a list of documents
 */
export function sanitizeDocuments<T extends Models.Document>(
    documents: T[],
    options?: Parameters<typeof sanitizeDocument>[1]
): Partial<T>[] {
    return documents.map(doc => sanitizeDocument(doc, options));
}

/**
 * Redact sensitive content from text
 * Useful for logging or displaying user-generated content
 */
export function redactSensitiveContent(text: string): string {
    // Remove email addresses
    text = text.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL_REDACTED]');

    // Remove phone numbers (simple pattern)
    text = text.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE_REDACTED]');

    // Remove credit card numbers (simple pattern)
    text = text.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD_REDACTED]');

    // Remove SSN patterns
    text = text.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN_REDACTED]');

    return text;
}

/**
 * Validate that data doesn't contain sensitive fields before sending to client
 * Throws an error if sensitive data is detected (use in development/testing)
 */
export function assertNoSensitiveData(data: unknown, context: string = 'data'): void {
    if (process.env.NODE_ENV === 'development') {
        const dataString = JSON.stringify(data);

        const foundSensitive = SENSITIVE_FIELDS.find(field =>
            dataString.includes(`"${field}":`)
        );

        if (foundSensitive) {
            throw new Error(
                `SECURITY ERROR: Sensitive field "${foundSensitive}" found in ${context}. ` +
                `This data should be sanitized before sending to the client!`
            );
        }
    }
}

/**
 * Type guard to ensure data has been sanitized
 * Use in TypeScript to enforce compile-time safety
 */
export type ClientSafeData<T> = Omit<T,
    | '$permissions'
    | '$databaseId'
    | '$collectionId'
    | 'password'
    | 'passwordHash'
    | 'apiKey'
>;

/**
 * Example usage in Server Actions:
 * 
 * ```typescript
 * // ❌ BAD - Exposes sensitive data
 * export async function getUser(userId: string) {
 *   const user = await databases.getDocument(DATABASE_ID, COLLECTION_IDS.USERS, userId);
 *   return user; // Contains $permissions, etc.
 * }
 * 
 * // ✅ GOOD - Sanitized data
 * export async function getUser(userId: string) {
 *   const user = await databases.getDocument(DATABASE_ID, COLLECTION_IDS.USERS, userId);
 *   return sanitizeDocument(user);
 * }
 * ```
 */
