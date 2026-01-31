/**
 * Entry point for embedding generation
 * Loads .env FIRST, then dynamically imports the main logic
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env BEFORE any other code runs
const result = dotenv.config({ path: path.resolve(process.cwd(), '.env') });

console.log('[STARTUP] Environment loaded from:', path.resolve(process.cwd(), '.env'));
console.log('[STARTUP] dotenv result:', result.error ? `Error: ${result.error.message}` : 'Success');
console.log('[STARTUP] CHROMA_API_KEY:', process.env.CHROMA_API_KEY ? `Set (${process.env.CHROMA_API_KEY.substring(0, 10)}...)` : 'NOT SET');
console.log('[STARTUP] CHROMA_TENANT:', process.env.CHROMA_TENANT || 'NOT SET');
console.log('[STARTUP] CHROMA_DATABASE:', process.env.CHROMA_DATABASE || 'NOT SET');
console.log('[STARTUP] GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Set' : 'NOT SET');
console.log('');

// Now dynamically import the main script (after env is loaded)
async function main() {
    const { runEmbeddingGeneration } = await import('./generateEmbeddings.main');
    await runEmbeddingGeneration();
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
