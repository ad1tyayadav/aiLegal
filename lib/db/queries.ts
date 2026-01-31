import { db } from './client';

/**
 * Get all clause patterns
 */
export function getAllClausePatterns() {
  return db.prepare(`
    SELECT 
      cp.clause_type,
      cp.keywords,
      cp.risk_level,
      cp.risk_score,
      cp.linked_section,
      cp.description,
      acts.section_number,
      acts.section_title,
      acts.full_text,
      acts.gov_url
    FROM clause_patterns cp
    JOIN act_sections acts ON cp.linked_section = acts.section_number
  `).all();
}

/**
 * Get Indian law section by number
 */
export function getIndianLawSection(sectionNumber: string) {
  return db.prepare(`
    SELECT * FROM act_sections WHERE section_number = ?
  `).get(sectionNumber);
}

/**
 * Search PDF text for related sections
 */
export function searchIndianLawText(query: string, limit: number = 5) {
  return db.prepare(`
    SELECT 
      ae.section_number,
      ae.chunk_text,
      ae.page_number,
      acts.section_title
    FROM act_embeddings ae
    JOIN act_sections acts ON ae.section_number = acts.section_number
    WHERE ae.chunk_text LIKE ?
    LIMIT ?
  `).all(`%${query}%`, limit);
}

/**
 * Get fair contract baseline by category
 */
export function getFairContractBaseline(category: string) {
  return db.prepare(`
    SELECT * FROM fair_contract_baseline WHERE clause_category = ?
  `).get(category);
}

/**
 * Get all fair contract baselines
 */
export function getAllFairContractBaselines() {
  return db.prepare(`
    SELECT * FROM fair_contract_baseline
  `).all();
}

/**
 * Get explanation template by clause type
 */
export function getExplanationTemplate(clauseType: string) {
  return db.prepare(`
    SELECT * FROM explanation_templates WHERE clause_type = ?
  `).get(clauseType);
}

/**
 * Get statistics about the database
 */
export function getDatabaseStats() {
  const sectionCount = db.prepare('SELECT COUNT(*) as count FROM act_sections').get() as { count: number };
  const patternCount = db.prepare('SELECT COUNT(*) as count FROM clause_patterns').get() as { count: number };
  const baselineCount = db.prepare('SELECT COUNT(*) as count FROM fair_contract_baseline').get() as { count: number };

  return {
    totalSections: sectionCount.count,
    totalPatterns: patternCount.count,
    totalBaselines: baselineCount.count
  };
}

/**
 * Get all clause patterns WITH embeddings (for semantic search)
 */
export function getClausePatternsWithEmbeddings() {
  return db.prepare(`
    SELECT 
      cp.id,
      cp.clause_type,
      cp.keywords,
      cp.risk_level,
      cp.risk_score,
      cp.linked_section,
      cp.description,
      cp.embedding_json,
      acts.section_number,
      acts.section_title,
      acts.full_text,
      acts.gov_url
    FROM clause_patterns cp
    JOIN act_sections acts ON cp.linked_section = acts.section_number
    WHERE cp.embedding_json IS NOT NULL
  `).all();
}

/**
 * Get all clause patterns (with or without embeddings)
 */
export function getAllClausePatternsRaw() {
  return db.prepare(`
    SELECT id, clause_type, description, keywords, embedding_json, linked_section
    FROM clause_patterns
  `).all();
}

/**
 * Update embedding for a clause pattern
 */
export function updatePatternEmbedding(patternId: number, embeddingJson: string) {
  console.log(`[DB] 💾 Saving embedding for pattern ID ${patternId}`);
  return db.prepare(`
    UPDATE clause_patterns 
    SET embedding_json = ? 
    WHERE id = ?
  `).run(embeddingJson, patternId);
}
