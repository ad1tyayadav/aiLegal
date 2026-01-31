/**
 * Entry point for embedding generation
 * Loads .env FIRST, then dynamically imports the main logic
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local BEFORE any other code runs (fallback to .env)
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

// Try .env.local first, then .env
let result = dotenv.config({ path: envLocalPath });
if (result.error) {
    result = dotenv.config({ path: envPath });
    console.log('[STARTUP] Environment loaded from:', envPath);
} else {
    console.log('[STARTUP] Environment loaded from:', envLocalPath);
}
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