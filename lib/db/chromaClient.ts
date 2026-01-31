/**
 * ChromaDB Client - Supports both Cloud and Local (Docker) modes
 * 
 * Configuration:
 * - Cloud (default): Set CHROMA_API_KEY, CHROMA_TENANT, CHROMA_DATABASE
 * - Local (Docker):  Set CHROMA_URL=http://localhost:8000
 */

import { ChromaClient, CloudClient, Collection } from 'chromadb';

// Lazy config getter - reads env vars when actually needed (after dotenv loads)
function getConfig() {
    return {
        CHROMA_API_KEY: process.env.CHROMA_API_KEY,
        CHROMA_TENANT: process.env.CHROMA_TENANT || 'default_tenant',
        CHROMA_DATABASE: process.env.CHROMA_DATABASE || 'default_database',
        CHROMA_URL: process.env.CHROMA_URL,
        COLLECTION_NAME: process.env.CHROMA_COLLECTION || 'clause_patterns'
    };
}

// Singleton instances - can be either CloudClient or ChromaClient
let client: CloudClient | ChromaClient | null = null;
let collection: Collection | null = null;

/**
 * Determine if we're using Cloud or Local mode
 */
export function getChromaMode(): 'cloud' | 'local' | 'disabled' {
    const config = getConfig();
    if (config.CHROMA_API_KEY) return 'cloud';
    if (config.CHROMA_URL) return 'local';
    return 'disabled';
}

/**
 * Get ChromaDB client (singleton)
 * Uses CloudClient for cloud mode, ChromaClient for local Docker
 */
export async function getChromaClient(): Promise<CloudClient | ChromaClient> {
    if (client) return client;

    const config = getConfig();
    const mode = getChromaMode();

    if (mode === 'cloud') {
        // ChromaDB Cloud mode - use CloudClient
        console.log('[CHROMA] ☁️ Connecting to ChromaDB Cloud...');
        console.log(`[CHROMA]    Tenant: ${config.CHROMA_TENANT}`);
        console.log(`[CHROMA]    Database: ${config.CHROMA_DATABASE}`);

        client = new CloudClient({
            apiKey: config.CHROMA_API_KEY!,
            tenant: config.CHROMA_TENANT,
            database: config.CHROMA_DATABASE,
        });

        console.log(`[CHROMA] ☁️ CloudClient initialized`);
    } else if (mode === 'local') {
        // Local Docker mode - use regular ChromaClient
        console.log(`[CHROMA] 🐳 Connecting to local ChromaDB at ${config.CHROMA_URL}...`);
        client = new ChromaClient({ path: config.CHROMA_URL });
        console.log(`[CHROMA] 🐳 Connected to local Docker instance`);
    } else {
        throw new Error(
            'ChromaDB not configured! Set either:\n' +
            '  - CHROMA_API_KEY (for Cloud)\n' +
            '  - CHROMA_URL (for local Docker)'
        );
    }

    return client;
}

/**
 * Get or create the clause patterns collection
 */
export async function getClausePatternsCollection(): Promise<Collection> {
    if (collection) return collection;

    const config = getConfig();
    const chromaClient = await getChromaClient();

    try {
        collection = await chromaClient.getOrCreateCollection({
            name: config.COLLECTION_NAME,
            metadata: {
                description: 'Legal clause patterns for semantic search',
                created: new Date().toISOString()
            }
        });

        const count = await collection.count();
        console.log(`[CHROMA] 📚 Collection "${config.COLLECTION_NAME}" ready (${count} patterns)`);

        return collection;
    } catch (error) {
        console.error('[CHROMA] ❌ Failed to get collection:', error);
        throw error;
    }
}

/**
 * Add patterns to ChromaDB collection
 */
export async function addPatternsToChroma(patterns: {
    id: string;
    embedding: number[];
    metadata: Record<string, string | number>;
    document: string;
}[]): Promise<void> {
    const coll = await getClausePatternsCollection();

    console.log(`[CHROMA] 📤 Adding ${patterns.length} patterns to collection...`);

    await coll.add({
        ids: patterns.map(p => p.id),
        embeddings: patterns.map(p => p.embedding),
        metadatas: patterns.map(p => p.metadata),
        documents: patterns.map(p => p.document)
    });

    console.log(`[CHROMA] ✅ Successfully added ${patterns.length} patterns`);
}

/**
 * Query similar patterns using vector similarity
 * Includes retry logic for transient cloud errors
 */
export async function querySimilarPatterns(
    embedding: number[],
    nResults: number = 5,
    threshold: number = 0.65
): Promise<{
    id: string;
    similarity: number;
    metadata: Record<string, any>;
    document: string;
}[]> {
    const coll = await getClausePatternsCollection();

    // Retry logic for transient errors (504, 503, etc.)
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const results = await coll.query({
                queryEmbeddings: [embedding],
                nResults,
                include: ['metadatas', 'documents', 'distances']
            });

            // ChromaDB returns L2 distances by default
            // Convert to similarity scores (lower distance = higher similarity)
            const matches = (results.ids[0] || []).map((id, i) => {
                const distance = results.distances?.[0]?.[i] || 2;
                // Approximate similarity from L2 distance
                const similarity = Math.max(0, 1 - (distance / 2));

                return {
                    id,
                    similarity,
                    metadata: results.metadatas?.[0]?.[i] || {},
                    document: results.documents?.[0]?.[i] || ''
                };
            });

            // Filter by threshold and sort by similarity
            return matches
                .filter(m => m.similarity >= threshold)
                .sort((a, b) => b.similarity - a.similarity);

        } catch (error: any) {
            lastError = error;
            const isRetryable = error.message?.includes('504') ||
                error.message?.includes('503') ||
                error.message?.includes('timeout');

            if (isRetryable && attempt < maxRetries) {
                const delay = attempt * 1000; // 1s, 2s, 3s
                console.log(`[CHROMA] ⏳ Retry ${attempt}/${maxRetries} after ${delay}ms...`);
                await new Promise(r => setTimeout(r, delay));
                continue;
            }
            throw error;
        }
    }

    throw lastError || new Error('Query failed after retries');
}

/**
 * Check if ChromaDB is available and configured
 */
export async function isChromaAvailable(): Promise<boolean> {
    const mode = getChromaMode();

    if (mode === 'disabled') {
        console.log('[CHROMA] ⚠️ ChromaDB not configured');
        return false;
    }

    try {
        const chromaClient = await getChromaClient();
        await chromaClient.heartbeat();
        console.log(`[CHROMA] 💚 ChromaDB heartbeat OK (${mode} mode)`);
        return true;
    } catch (error) {
        console.warn(`[CHROMA] ❌ ChromaDB not reachable (${mode} mode):`, error);
        return false;
    }
}

/**
 * Get collection statistics
 */
export async function getChromaStats(): Promise<{
    mode: 'cloud' | 'local' | 'disabled';
    collection: string;
    count: number;
} | null> {
    const config = getConfig();

    try {
        const coll = await getClausePatternsCollection();
        const count = await coll.count();

        return {
            mode: getChromaMode(),
            collection: config.COLLECTION_NAME,
            count
        };
    } catch {
        return null;
    }
}

/**
 * Delete all patterns from collection (for re-seeding)
 */
export async function clearChromaCollection(): Promise<void> {
    const config = getConfig();
    const chromaClient = await getChromaClient();

    try {
        await chromaClient.deleteCollection({ name: config.COLLECTION_NAME });
        collection = null; // Reset singleton
        console.log(`[CHROMA] 🗑️ Deleted collection "${config.COLLECTION_NAME}"`);
    } catch (error) {
        console.log(`[CHROMA] Collection "${config.COLLECTION_NAME}" doesn't exist or already deleted`);
    }
}
