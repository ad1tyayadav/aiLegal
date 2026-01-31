/**
 * Semantic Validator Service
 * 
 * Uses ChromaDB for vector similarity search.
 * Supports both ChromaDB Cloud and Local Docker modes.
 * Falls back gracefully if ChromaDB is not available.
 */

import { getEmbedding, hashText } from '../utils/vector.utils';
import { querySimilarPatterns, isChromaAvailable, getChromaMode, getChromaStats } from '../db/chromaClient';
import type { Clause, SemanticMatch } from '../types/contract.types';

// In-memory cache for clause embeddings (reduces API calls within a request)
const embeddingCache = new Map<string, number[]>();

// Similarity threshold - RAISED to reduce false positives
// 75% is a good balance for legal text similarity
const SIMILARITY_THRESHOLD = 0.75;
const MIN_CLAUSE_LENGTH = 50;

/**
 * Patterns that indicate SAFE/STANDARD clauses - should NOT be flagged
 * These help prevent false positives on normal contract language
 */
const SAFE_CLAUSE_PATTERNS = {
    // Standard deliverables - NOT IP transfer
    deliverables: [
        /shall deliver|will deliver|agrees to deliver/i,
        /deliverables include|deliverables shall/i,
        /complete.*source code.*documentation/i,
        /provide.*documentation.*manual/i
    ],
    // Fee/payment statements (just stating amount, not unfair terms)
    feeStatements: [
        /total fee.*inr|fee of.*rupees/i,
        /compensation.*shall be/i,
        /milestone.*payment/i
    ],
    // Fair IP with protective language
    fairIP: [
        /upon (full )?payment.*transfer|transfer.*upon.*payment/i,
        /ip.*in the (application|deliverable|work product)/i,
        /contractor retains|developer retains/i,
        /pre-existing.*materials/i
    ],
    // Standard timeline/scope clauses
    standardTerms: [
        /completion within.*days/i,
        /project timeline/i,
        /milestones? (are|shall)/i
    ]
};

/**
 * Check if a clause matches safe/standard patterns
 * Returns true if it should NOT be flagged
 */
function isStandardSafeClause(text: string, matchedPattern: string): boolean {
    const lowerText = text.toLowerCase();

    // Check against safe patterns based on what it was matched as
    if (matchedPattern.includes('ip_transfer') || matchedPattern.includes('blanket_ip')) {
        // Check if this looks like a standard deliverables clause
        for (const pattern of SAFE_CLAUSE_PATTERNS.deliverables) {
            if (pattern.test(text)) {
                console.log(`[SEMANTIC] ⏭️ Skipping: matches safe deliverables pattern`);
                return true;
            }
        }
        // Check for fair IP language
        for (const pattern of SAFE_CLAUSE_PATTERNS.fairIP) {
            if (pattern.test(text)) {
                console.log(`[SEMANTIC] ⏭️ Skipping: matches fair IP pattern`);
                return true;
            }
        }
    }

    if (matchedPattern.includes('payment') || matchedPattern.includes('unfair')) {
        // Check if this is just stating the fee amount
        for (const pattern of SAFE_CLAUSE_PATTERNS.feeStatements) {
            if (pattern.test(text)) {
                console.log(`[SEMANTIC] ⏭️ Skipping: matches fee statement pattern`);
                return true;
            }
        }
    }

    if (matchedPattern.includes('vague_scope')) {
        // Standard timeline/milestone clauses are not vague
        for (const pattern of SAFE_CLAUSE_PATTERNS.standardTerms) {
            if (pattern.test(text)) {
                console.log(`[SEMANTIC] ⏭️ Skipping: matches standard terms pattern`);
                return true;
            }
        }
    }

    return false;
}

/**
 * Semantic validation using ChromaDB vector search
 * INDEPENDENT from keyword validation - can be used alone or combined
 */
export async function validateSemantic(clauses: Clause[]): Promise<SemanticMatch[]> {
    const startTime = Date.now();
    const matches: SemanticMatch[] = [];

    console.log('\n[SEMANTIC] ═══════════════════════════════════════════════════════');
    console.log(`[SEMANTIC] 🔍 Starting semantic validation for ${clauses.length} clauses`);
    console.log(`[SEMANTIC] Threshold: ${(SIMILARITY_THRESHOLD * 100).toFixed(0)}%`);

    // Check ChromaDB availability
    const mode = getChromaMode();
    console.log(`[SEMANTIC] Mode: ${mode.toUpperCase()}`);

    if (mode === 'disabled') {
        console.log('[SEMANTIC] ⚠️ ChromaDB not configured, skipping semantic search');
        console.log('[SEMANTIC] 💡 Set CHROMA_API_KEY (Cloud) or CHROMA_URL (Docker) in .env');
        console.log('[SEMANTIC] ═══════════════════════════════════════════════════════\n');
        return [];
    }

    const chromaUp = await isChromaAvailable();
    if (!chromaUp) {
        console.log('[SEMANTIC] ⚠️ ChromaDB not reachable, skipping semantic search');
        console.log('[SEMANTIC] ═══════════════════════════════════════════════════════\n');
        return [];
    }

    // Check if patterns exist in ChromaDB
    const stats = await getChromaStats();
    if (!stats || stats.count === 0) {
        console.log('[SEMANTIC] ⚠️ No patterns in ChromaDB');
        console.log('[SEMANTIC] 💡 Run: npm run generate-embeddings');
        console.log('[SEMANTIC] ═══════════════════════════════════════════════════════\n');
        return [];
    }

    console.log(`[SEMANTIC] 📚 ${stats.count} patterns available in ChromaDB`);
    console.log('[SEMANTIC] ═══════════════════════════════════════════════════════\n');

    // Process each clause
    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const clause of clauses) {
        // Skip very short clauses
        if (clause.text.length < MIN_CLAUSE_LENGTH) {
            console.log(`[SEMANTIC] ⏭️ Clause ${clause.id}: Too short (${clause.text.length} chars)`);
            skippedCount++;
            continue;
        }

        processedCount++;
        console.log(`\n[SEMANTIC] ─── Clause ${clause.id} ───`);
        console.log(`[SEMANTIC] Text: "${clause.text.substring(0, 80)}..."`);

        // Get embedding (with caching)
        let clauseEmbedding: number[];
        const cacheKey = hashText(clause.text);

        if (embeddingCache.has(cacheKey)) {
            clauseEmbedding = embeddingCache.get(cacheKey)!;
            console.log(`[SEMANTIC] 📦 Using cached embedding`);
        } else {
            try {
                clauseEmbedding = await getEmbedding(clause.text);
                embeddingCache.set(cacheKey, clauseEmbedding);
            } catch (error) {
                console.warn(`[SEMANTIC] ❌ Failed to embed clause ${clause.id}:`, error);
                errorCount++;
                continue;
            }
        }

        // Query ChromaDB for similar patterns
        try {
            const similar = await querySimilarPatterns(
                clauseEmbedding,
                3,  // Get top 3 matches
                SIMILARITY_THRESHOLD
            );

            if (similar.length > 0) {
                const best = similar[0];
                const percent = (best.similarity * 100).toFixed(1);
                const patternType = String(best.metadata.clause_type);

                console.log(`[SEMANTIC] ✅ Found ${similar.length} matches:`);
                similar.forEach((m, i) => {
                    console.log(`    ${i + 1}. ${m.metadata.clause_type}: ${(m.similarity * 100).toFixed(1)}%`);
                });
                console.log(`[SEMANTIC] 🎯 Best: ${patternType} (${percent}%)`);

                // Check if this is actually a false positive (safe clause)
                if (isStandardSafeClause(clause.text, patternType)) {
                    console.log(`[SEMANTIC] ⚪ FALSE POSITIVE BLOCKED: Safe clause detected`);
                    continue; // Skip this match
                }

                matches.push({
                    clauseId: clause.id,
                    clauseText: clause.text,
                    matchedPattern: patternType,
                    similarity: Math.round(best.similarity * 100) / 100,
                    riskLevel: best.metadata.risk_level as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
                    riskScore: Number(best.metadata.risk_score) || 0,
                    sectionNumber: String(best.metadata.linked_section),
                    sectionTitle: String(best.metadata.section_title || ''),
                    description: String(best.metadata.description),
                    matchSource: 'semantic' as const
                });
            } else {
                console.log(`[SEMANTIC] No match above ${(SIMILARITY_THRESHOLD * 100).toFixed(0)}% threshold`);
            }
        } catch (error) {
            console.warn(`[SEMANTIC] ❌ ChromaDB query failed for clause ${clause.id}:`, error);
            errorCount++;
        }
    }

    const duration = Date.now() - startTime;

    console.log('\n[SEMANTIC] ═══════════════════════════════════════════════════════');
    console.log(`[SEMANTIC] ✅ Semantic validation complete in ${duration}ms`);
    console.log(`[SEMANTIC] 📊 Results:`);
    console.log(`  • Clauses processed: ${processedCount}`);
    console.log(`  • Clauses skipped (too short): ${skippedCount}`);
    console.log(`  • Errors: ${errorCount}`);
    console.log(`  • Semantic matches found: ${matches.length}`);
    console.log('[SEMANTIC] ═══════════════════════════════════════════════════════\n');

    return matches;
}

/**
 * Clear the embedding cache (call at end of request)
 */
export function clearEmbeddingCache(): void {
    const size = embeddingCache.size;
    embeddingCache.clear();
    if (size > 0) {
        console.log(`[SEMANTIC] 🧹 Cleared embedding cache (${size} entries)`);
    }
}

/**
 * Get cache statistics
 */
export function getEmbeddingCacheStats(): { size: number; keys: string[] } {
    return {
        size: embeddingCache.size,
        keys: Array.from(embeddingCache.keys())
    };
}
