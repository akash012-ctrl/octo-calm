/**
 * Appwrite Database Setup Script
 * 
 * This script creates the database and collections for Octo-Calm.
 * Run this after setting up your Appwrite project and adding credentials to .env.local
 * 
 * Usage: node scripts/setup-database.mjs
 */

import { Client, Databases } from 'node-appwrite';

// Initialize Appwrite client
const client = new Client();
client
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '');

const databases = new Databases(client);

// Configuration
const DATABASE_NAME = 'octo_calm_db';
const DATABASE_ID = 'octo_calm_db';

const collections = [
    {
        id: 'users',
        name: 'Users',
        attributes: [
            { key: 'userId', type: 'string', size: 255, required: true },
            { key: 'email', type: 'email', required: true },
            { key: 'name', type: 'string', size: 100, required: true },
        ],
    },
    {
        id: 'user_preferences',
        name: 'User Preferences',
        attributes: [
            { key: 'userId', type: 'string', size: 255, required: true },
            { key: 'theme', type: 'enum', elements: ['light', 'dark', 'system'], required: true },
            { key: 'notificationsEnabled', type: 'boolean', required: true, default: true },
            { key: 'emailNotifications', type: 'boolean', required: true, default: false },
            { key: 'moodReminderTime', type: 'string', size: 10, required: false },
            { key: 'moodReminderFrequency', type: 'enum', elements: ['daily', 'twice-daily', 'weekly', 'disabled'], required: true },
            { key: 'aiPersonality', type: 'enum', elements: ['calm', 'encouraging', 'professional', 'friendly'], required: true },
            { key: 'dataRetentionDays', type: 'integer', required: true, default: 90 },
        ],
    },
    {
        id: 'mood_checkins',
        name: 'Mood Check-ins',
        attributes: [
            { key: 'userId', type: 'string', size: 255, required: true },
            { key: 'mood', type: 'enum', elements: ['anxious', 'sad', 'stressed', 'angry', 'neutral', 'content', 'happy', 'energetic'], required: true },
            { key: 'intensity', type: 'integer', required: true, min: 1, max: 5 },
            { key: 'notes', type: 'string', size: 1000, required: false },
            { key: 'triggers', type: 'string', size: 500, required: false, array: true },
            { key: 'activities', type: 'string', size: 500, required: false, array: true },
            { key: 'timestamp', type: 'datetime', required: true },
        ],
    },
    {
        id: 'intervention_sessions',
        name: 'Intervention Sessions',
        attributes: [
            { key: 'userId', type: 'string', size: 255, required: true },
            { key: 'interventionType', type: 'enum', elements: ['breathing', 'meditation', 'journaling', 'physical-activity', 'grounding', 'cognitive-reframing', 'distraction', 'social-support'], required: true },
            { key: 'duration', type: 'integer', required: true },
            { key: 'completed', type: 'boolean', required: true },
            { key: 'rating', type: 'integer', required: false, min: 1, max: 5 },
            { key: 'notes', type: 'string', size: 1000, required: false },
            { key: 'triggerMoodId', type: 'string', size: 255, required: false },
            { key: 'startedAt', type: 'datetime', required: true },
            { key: 'completedAt', type: 'datetime', required: false },
        ],
    },
    {
        id: 'journal_entries',
        name: 'Journal Entries',
        attributes: [
            { key: 'userId', type: 'string', size: 255, required: true },
            { key: 'content', type: 'string', size: 10000, required: true },
            { key: 'prompt', type: 'string', size: 500, required: false },
            { key: 'mood', type: 'enum', elements: ['anxious', 'sad', 'stressed', 'angry', 'neutral', 'content', 'happy', 'energetic'], required: false },
            { key: 'sentiment', type: 'enum', elements: ['positive', 'neutral', 'negative'], required: false },
        ],
    },
    {
        id: 'learned_patterns',
        name: 'Learned Patterns',
        attributes: [
            { key: 'userId', type: 'string', size: 255, required: true },
            { key: 'patternType', type: 'enum', elements: ['trigger', 'coping', 'activity', 'time-of-day'], required: true },
            { key: 'pattern', type: 'string', size: 500, required: true },
            { key: 'confidence', type: 'float', required: true },
            { key: 'occurrences', type: 'integer', required: true },
            { key: 'lastObserved', type: 'datetime', required: true },
        ],
    },
    {
        id: 'safety_logs',
        name: 'Safety Logs',
        attributes: [
            { key: 'userId', type: 'string', size: 255, required: true },
            { key: 'severity', type: 'enum', elements: ['low', 'medium', 'high', 'critical'], required: true },
            { key: 'detectedKeywords', type: 'string', size: 500, required: false, array: true },
            { key: 'context', type: 'string', size: 2000, required: false },
            { key: 'actionTaken', type: 'enum', elements: ['resources-provided', 'escalated', 'monitored', 'none'], required: true },
            { key: 'timestamp', type: 'datetime', required: true },
        ],
    },
    {
        id: 'peer_posts',
        name: 'Peer Support Posts',
        attributes: [
            { key: 'userId', type: 'string', size: 255, required: true },
            { key: 'content', type: 'string', size: 5000, required: true },
            { key: 'category', type: 'enum', elements: ['question', 'experience', 'victory', 'support'], required: true },
            { key: 'mood', type: 'enum', elements: ['anxious', 'sad', 'stressed', 'angry', 'neutral', 'content', 'happy', 'energetic'], required: false },
            { key: 'anonymous', type: 'boolean', required: true, default: false },
            { key: 'supportCount', type: 'integer', required: true, default: 0 },
            { key: 'commentCount', type: 'integer', required: true, default: 0 },
            { key: 'moderated', type: 'boolean', required: true, default: false },
        ],
    },
];

async function setupDatabase() {
    try {
        console.log('🚀 Starting Appwrite database setup...\n');

        // Check if environment variables are set
        if (!process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID) {
            throw new Error('NEXT_PUBLIC_APPWRITE_PROJECT_ID is not set in .env.local');
        }
        if (!process.env.APPWRITE_API_KEY) {
            throw new Error('APPWRITE_API_KEY is not set in .env.local');
        }

        // Create database
        console.log(`📦 Creating database: ${DATABASE_NAME}`);
        let database;
        try {
            database = await databases.create(DATABASE_ID, DATABASE_NAME);
            console.log(`✅ Database created: ${database.$id}\n`);
        } catch (error) {
            if (error.code === 409) {
                console.log(`ℹ️  Database already exists: ${DATABASE_ID}\n`);
            } else {
                throw error;
            }
        }

        // Create collections
        for (const collection of collections) {
            console.log(`📋 Creating collection: ${collection.name}`);

            try {
                const createdCollection = await databases.createCollection(
                    DATABASE_ID,
                    collection.id,
                    collection.name,
                    [
                        `read("user:[USER_ID]")`,
                        `write("user:[USER_ID]")`,
                    ],
                    false, // documentSecurity
                    true   // enabled
                );
                console.log(`✅ Collection created: ${createdCollection.$id}`);

                // Create attributes
                for (const attr of collection.attributes) {
                    console.log(`  ⚙️  Creating attribute: ${attr.key}`);

                    try {
                        if (attr.type === 'string') {
                            await databases.createStringAttribute(
                                DATABASE_ID,
                                collection.id,
                                attr.key,
                                attr.size,
                                attr.required,
                                attr.default,
                                attr.array || false
                            );
                        } else if (attr.type === 'email') {
                            await databases.createEmailAttribute(
                                DATABASE_ID,
                                collection.id,
                                attr.key,
                                attr.required,
                                attr.default,
                                attr.array || false
                            );
                        } else if (attr.type === 'enum') {
                            await databases.createEnumAttribute(
                                DATABASE_ID,
                                collection.id,
                                attr.key,
                                attr.elements,
                                attr.required,
                                attr.default,
                                attr.array || false
                            );
                        } else if (attr.type === 'integer') {
                            await databases.createIntegerAttribute(
                                DATABASE_ID,
                                collection.id,
                                attr.key,
                                attr.required,
                                attr.min,
                                attr.max,
                                attr.default,
                                attr.array || false
                            );
                        } else if (attr.type === 'float') {
                            await databases.createFloatAttribute(
                                DATABASE_ID,
                                collection.id,
                                attr.key,
                                attr.required,
                                attr.min,
                                attr.max,
                                attr.default,
                                attr.array || false
                            );
                        } else if (attr.type === 'boolean') {
                            await databases.createBooleanAttribute(
                                DATABASE_ID,
                                collection.id,
                                attr.key,
                                attr.required,
                                attr.default,
                                attr.array || false
                            );
                        } else if (attr.type === 'datetime') {
                            await databases.createDatetimeAttribute(
                                DATABASE_ID,
                                collection.id,
                                attr.key,
                                attr.required,
                                attr.default,
                                attr.array || false
                            );
                        }
                        console.log(`  ✅ Attribute created: ${attr.key}`);
                    } catch (attrError) {
                        if (attrError.code === 409) {
                            console.log(`  ℹ️  Attribute already exists: ${attr.key}`);
                        } else {
                            console.error(`  ❌ Error creating attribute ${attr.key}:`, attrError.message);
                        }
                    }
                }

                console.log('');
            } catch (error) {
                if (error.code === 409) {
                    console.log(`ℹ️  Collection already exists: ${collection.id}\n`);
                } else {
                    throw error;
                }
            }
        }

        console.log('✨ Database setup completed successfully!\n');
        console.log('📝 Next steps:');
        console.log('1. Update your .env.local with the database ID:');
        console.log(`   NEXT_PUBLIC_APPWRITE_DATABASE_ID=${DATABASE_ID}`);
        console.log('2. Update collection IDs in .env.local');
        console.log('3. Restart your dev server: npm run dev\n');

    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    }
}

// Run the setup
setupDatabase();
