import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * Calculate cosine similarity between two vectors
 * Range: -1 to 1 (1 = identical, 0 = unrelated, -1 = opposite)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
        console.error(`[VECTOR] ❌ Dimension mismatch: ${a.length} vs ${b.length}`);
        throw new Error(`Vector dimensions must match: ${a.length} vs ${b.length}`);
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    const similarity = denominator === 0 ? 0 : dotProduct / denominator;

    return similarity;
}

/**
 * Get embedding vector from Gemini API
 * Uses text-embedding-004 model (768 dimensions)
 */
export async function getEmbedding(text: string): Promise<number[]> {
    const startTime = Date.now();

    try {
        const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

        // Enhance legal context for better embeddings
        const enhancedText = `Legal contract clause: ${text}`;

        console.log(`[EMBEDDING] 🔄 Generating embedding for: "${text.substring(0, 80)}..."`);

        const result = await model.embedContent(enhancedText);
        const embedding = result.embedding.values;

        const duration = Date.now() - startTime;
        console.log(`[EMBEDDING] ✅ Generated ${embedding.length}-dim vector in ${duration}ms`);

        return embedding;
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[EMBEDDING] ❌ Failed after ${duration}ms:`, error);
        throw error;
    }
}

/**
 * Simple text hash for caching (first 100 chars + length)
 */
export function hashText(text: string): string {
    const normalized = text.toLowerCase().trim().substring(0, 100);
    return `${normalized.length}_${normalized.replace(/\s+/g, '_').substring(0, 50)}`;
}

/**
 * Debug helper: Log similarity comparison
 */
export function logSimilarityComparison(
    clauseText: string,
    patternType: string,
    similarity: number,
    threshold: number
): void {
    const status = similarity >= threshold ? '✅ MATCH' : '❌ Below threshold';
    const percent = (similarity * 100).toFixed(1);

    console.log(`[SIMILARITY] ${status}`);
    console.log(`  Pattern: ${patternType}`);
    console.log(`  Clause: "${clauseText.substring(0, 60)}..."`);
    console.log(`  Score: ${percent}% (threshold: ${(threshold * 100).toFixed(0)}%)`);
}
