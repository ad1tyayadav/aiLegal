import { db } from './client';

/**
 * Add embedding_json column to clause_patterns (idempotent)
 */
export function addEmbeddingColumn(): void {
    try {
        db.exec('ALTER TABLE clause_patterns ADD COLUMN embedding_json TEXT');
        console.log('[MIGRATION] ✅ Added embedding_json column to clause_patterns');
    } catch (error: any) {
        if (error.message.includes('duplicate column')) {
            console.log('[MIGRATION] ℹ️ embedding_json column already exists (skipping)');
        } else {
            console.error('[MIGRATION] ❌ Failed to add column:', error.message);
            throw error;
        }
    }
}

/**
 * Check if embeddings exist in database
 */
export function checkEmbeddingsExist(): { total: number; withEmbeddings: number } {
    const total = db.prepare('SELECT COUNT(*) as count FROM clause_patterns').get() as { count: number };

    let withEmbeddings = { count: 0 };
    try {
        withEmbeddings = db.prepare(
            'SELECT COUNT(*) as count FROM clause_patterns WHERE embedding_json IS NOT NULL'
        ).get() as { count: number };
    } catch {
        // Column might not exist yet
    }

    console.log(`[MIGRATION] 📊 Patterns: ${withEmbeddings.count}/${total.count} have embeddings`);

    return {
        total: total.count,
        withEmbeddings: withEmbeddings.count
    };
}

/**
 * Run all pending migrations
 */
export function runMigrations(): void {
    console.log('[MIGRATION] 🔄 Running database migrations...');
    addEmbeddingColumn();
    checkEmbeddingsExist();
    console.log('[MIGRATION] ✅ Migrations complete\n');
}
