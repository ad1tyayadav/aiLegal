/**
 * Main embedding generation logic
 * This file is dynamically imported AFTER .env is loaded
 */

import { db } from '../lib/db/client';
import { runMigrations } from '../lib/db/migrations';
import { getEmbedding } from '../lib/utils/vector.utils';
import {
    isChromaAvailable,
    getChromaMode,
    addPatternsToChroma,
    getClausePatternsCollection,
    clearChromaCollection
} from '../lib/db/chromaClient';

interface ClausePattern {
    id: number;
    clause_type: string;
    description: string;
    keywords: string;
    risk_level: string;
    risk_score: number;
    linked_section: string;
    section_title: string;
}

export async function runEmbeddingGeneration() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║       EMBEDDING GENERATION SCRIPT                          ║');
    console.log('║       Generates vectors and stores in ChromaDB             ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // 1. Run SQLite migrations (for backward compatibility)
    runMigrations();

    // 2. Check ChromaDB mode and connection
    const mode = getChromaMode();
    console.log(`[CONFIG] ChromaDB mode: ${mode.toUpperCase()}`);

    if (mode === 'disabled') {
        console.error('\n❌ ChromaDB not configured!');
        console.error('   Set one of these in your .env file:\n');
        console.error('   Option 1: ChromaDB Cloud (Free Tier)');
        console.error('   ─────────────────────────────────────');
        console.error('   CHROMA_API_KEY=your_api_key_here');
        console.error('   CHROMA_TENANT=your_tenant');
        console.error('   CHROMA_DATABASE=your_database\n');
        console.error('   Option 2: Local Docker');
        console.error('   ─────────────────────────────────────');
        console.error('   CHROMA_URL=http://localhost:8000\n');
        console.error('   Get free ChromaDB Cloud API key at: https://trychroma.com');
        process.exit(1);
    }

    const chromaUp = await isChromaAvailable();
    if (!chromaUp) {
        console.error('\n❌ Cannot connect to ChromaDB!');
        if (mode === 'cloud') {
            console.error('   Check your CHROMA_API_KEY is correct');
        } else {
            console.error('   Make sure Docker is running with ChromaDB');
            console.error('   Run: docker run -d -p 8000:8000 chromadb/chroma');
        }
        process.exit(1);
    }
    console.log('');

    // 3. Get patterns from SQLite
    const patterns = db.prepare(`
        SELECT cp.id, cp.clause_type, cp.description, cp.keywords, 
               cp.risk_level, cp.risk_score, cp.linked_section,
               acts.section_title
        FROM clause_patterns cp
        JOIN act_sections acts ON cp.linked_section = acts.section_number
    `).all() as ClausePattern[];

    console.log(`📊 Found ${patterns.length} clause patterns in SQLite\n`);

    if (patterns.length === 0) {
        console.log('⚠️ No patterns found! Run: npm run seed');
        process.exit(1);
    }

    // 4. Check if ChromaDB already has patterns
    const collection = await getClausePatternsCollection();
    const existingCount = await collection.count();

    if (existingCount > 0) {
        console.log(`\n⚠️ ChromaDB already has ${existingCount} patterns.`);
        console.log('   Do you want to clear and regenerate? (Set CHROMA_FORCE_RESET=true)\n');

        if (process.env.CHROMA_FORCE_RESET === 'true') {
            console.log('🗑️ Clearing existing collection...');
            await clearChromaCollection();
        } else {
            console.log('   Skipping generation. Existing patterns will be used.');
            console.log('   To regenerate, run with: CHROMA_FORCE_RESET=true npm run generate-embeddings\n');
            process.exit(0);
        }
    }

    // 5. Generate embeddings for each pattern
    console.log('┌──────────────────────────────────────────────────────────────┐');
    console.log('│ Generating embeddings...                                      │');
    console.log('└──────────────────────────────────────────────────────────────┘\n');

    const chromaPatterns: {
        id: string;
        embedding: number[];
        metadata: Record<string, string | number>;
        document: string;
    }[] = [];

    let generated = 0;
    let failed = 0;

    for (const pattern of patterns) {
        // Create embedding text from description + keywords
        let keywords: string[] = [];
        try {
            keywords = JSON.parse(pattern.keywords || '[]');
        } catch {
            keywords = [];
        }

        const embeddingText = `${pattern.description}. Related terms: ${keywords.slice(0, 5).join(', ')}`;

        console.log(`🔄 [${pattern.id}] ${pattern.clause_type}`);
        console.log(`    Section: ${pattern.linked_section}`);
        console.log(`    Text: "${embeddingText.substring(0, 60)}..."`);

        try {
            const startTime = Date.now();
            const embedding = await getEmbedding(embeddingText);
            const duration = Date.now() - startTime;

            chromaPatterns.push({
                id: `pattern_${pattern.id}`,
                embedding,
                metadata: {
                    clause_type: pattern.clause_type,
                    risk_level: pattern.risk_level,
                    risk_score: pattern.risk_score,
                    linked_section: pattern.linked_section,
                    section_title: pattern.section_title || '',
                    description: pattern.description
                },
                document: embeddingText
            });

            console.log(`    ✅ Generated ${embedding.length}-dim vector in ${duration}ms\n`);
            generated++;

            // Rate limiting: wait 200ms between API calls
            await new Promise(resolve => setTimeout(resolve, 200));

        } catch (error: any) {
            console.error(`    ❌ Failed: ${error.message}\n`);
            failed++;
        }
    }

    // 6. Batch insert to ChromaDB
    if (chromaPatterns.length > 0) {
        console.log('\n📤 Uploading to ChromaDB...');
        await addPatternsToChroma(chromaPatterns);
    }

    // 7. Summary
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    GENERATION COMPLETE                      ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Mode:        ${mode.toUpperCase().padEnd(44)}║`);
    console.log(`║  ✅ Generated: ${String(generated).padEnd(4)} embeddings                         ║`);
    console.log(`║  ❌ Failed:    ${String(failed).padEnd(4)} patterns                             ║`);
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    if (generated > 0) {
        console.log('🎉 ChromaDB is ready! Semantic search is now enabled.\n');
        console.log('   Start the dev server: npm run dev');
        console.log('   Test with a contract upload\n');
    }

    if (failed > 0) {
        console.log('⚠️ Some embeddings failed. Check your HF_TOKEN.\n');
    }
}
