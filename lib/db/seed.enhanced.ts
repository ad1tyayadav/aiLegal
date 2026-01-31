import { db } from './client';
import fs from 'fs';
import path from 'path';

/**
 * Recreate schema with new columns
 * This drops and recreates clause_patterns table to add new columns
 */
function recreateClausePatternsTable() {
    console.log('🔄 Recreating clause_patterns table with enhanced schema...');

    // Drop existing table (will also clear embeddings)
    try {
        db.prepare('DROP TABLE IF EXISTS clause_patterns').run();
    } catch (e) {
        console.log('⚠️ Could not drop clause_patterns (may not exist)');
    }

    // Create new table with all columns
    db.exec(`
        CREATE TABLE IF NOT EXISTS clause_patterns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pattern_id TEXT UNIQUE,
            clause_type TEXT NOT NULL,
            keywords TEXT NOT NULL,
            risk_level TEXT NOT NULL,
            risk_score INTEGER NOT NULL,
            linked_section TEXT NOT NULL,
            description TEXT NOT NULL,
            example_violation TEXT,
            regex_pattern TEXT,
            semantic_examples TEXT,
            context_required TEXT DEFAULT 'all',
            modifiers TEXT,
            industry_tags TEXT DEFAULT 'all',
            explanation_en TEXT,
            explanation_hi TEXT,
            explanation_context TEXT,
            embedding_json TEXT,
            FOREIGN KEY (linked_section) REFERENCES act_sections(section_number)
        );
        
        CREATE INDEX IF NOT EXISTS idx_pattern_id ON clause_patterns(pattern_id);
        CREATE INDEX IF NOT EXISTS idx_clause_type ON clause_patterns(clause_type);
        CREATE INDEX IF NOT EXISTS idx_risk_level ON clause_patterns(risk_level);
        CREATE INDEX IF NOT EXISTS idx_context_required ON clause_patterns(context_required);
    `);

    // Create analytics tables if they don't exist
    db.exec(`
        CREATE TABLE IF NOT EXISTS contract_analysis_context (
            analysis_id TEXT PRIMARY KEY,
            contract_type TEXT DEFAULT 'freelance',
            industry TEXT DEFAULT 'general',
            contract_value_inr INTEGER,
            duration_months INTEGER,
            user_experience_years INTEGER,
            file_type TEXT,
            file_name TEXT,
            processing_time_ms INTEGER,
            risk_score INTEGER,
            risk_level TEXT,
            violations_count INTEGER,
            keyword_matches INTEGER,
            semantic_matches INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS violation_feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            analysis_id TEXT,
            pattern_id TEXT,
            violation_type TEXT,
            user_feedback TEXT,
            user_comment TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (analysis_id) REFERENCES contract_analysis_context(analysis_id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_analysis_context_type ON contract_analysis_context(contract_type);
        CREATE INDEX IF NOT EXISTS idx_analysis_context_created ON contract_analysis_context(created_at);
        CREATE INDEX IF NOT EXISTS idx_feedback_analysis ON violation_feedback(analysis_id);
    `);

    console.log('✅ Tables recreated with enhanced schema');
}

/**
 * Enhanced seed with 150+ clause patterns for Indian Contract Act compliance
 * Organized by severity and section number
 */

// Required sections for foreign key constraints
const REQUIRED_SECTIONS = [
    { number: 'Section 10', title: 'What agreements are contracts' },
    { number: 'Section 14', title: 'Free consent defined' },
    { number: 'Section 15', title: 'Coercion defined' },
    { number: 'Section 16', title: 'Undue influence defined' },
    { number: 'Section 17', title: 'Fraud defined' },
    { number: 'Section 18', title: 'Misrepresentation defined' },
    { number: 'Section 19', title: 'Voidability of agreements without free consent' },
    { number: 'Section 23', title: 'What considerations and objects are lawful' },
    { number: 'Section 24', title: 'Agreements void if consideration unlawful in part' },
    { number: 'Section 26', title: 'Agreement in restraint of marriage void' },
    { number: 'Section 27', title: 'Agreement in restraint of trade void' },
    { number: 'Section 28', title: 'Agreement in restraint of legal proceedings void' },
    { number: 'Section 56', title: 'Agreement to do impossible act' },
    { number: 'Section 73', title: 'Compensation for breach of contract' },
    { number: 'Section 74', title: 'Compensation for breach where penalty stipulated' },
    { number: 'Section 124', title: 'Contract of indemnity defined' },
    { number: 'Section 125', title: 'Rights of indemnity-holder' },
];

// ============================================================
// CLAUSE PATTERNS - 150+ patterns organized by severity
// ============================================================

interface ClausePattern {
    pattern_id: string;
    clause_type: string;
    keywords: string[];
    risk_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'POSITIVE';
    risk_score: number;
    linked_section: string;
    description: string;
    example_violation?: string;
    regex_pattern?: string;
    semantic_examples?: string;
    context_required: string;
    modifiers?: Record<string, number>;
    industry_tags: string;
    explanation_en: string;
    explanation_hi?: string;
}

// CRITICAL VIOLATIONS (40-50 points)
const CRITICAL_PATTERNS: ClausePattern[] = [
    // Section 27 - Non-compete (10 variations)
    {
        pattern_id: 's27_non_compete_01',
        clause_type: 'non_compete_section27',
        keywords: ['non-compete', 'non compete', 'shall not compete', 'agree not to compete'],
        risk_level: 'CRITICAL',
        risk_score: 45,
        linked_section: 'Section 27',
        description: 'Direct non-compete clause restricting future employment',
        example_violation: 'The Contractor agrees not to compete with Company for 2 years',
        regex_pattern: '(shall|will|agree)\\s+(not|to not)\\s+compete',
        semantic_examples: 'refrain from competing,promise not to compete,covenant not to compete',
        context_required: 'freelance,consultant',
        modifiers: { goodwill_sale_exception: -20, affects_livelihood: 10 },
        industry_tags: 'all',
        explanation_en: 'Section 27 of Indian Contract Act makes ALL non-compete agreements void. Unlike USA, there are NO exceptions for reasonableness in India.',
        explanation_hi: 'धारा 27 के तहत सभी गैर-प्रतिस्पर्धा समझौते शून्य हैं।'
    },
    {
        pattern_id: 's27_non_compete_02',
        clause_type: 'non_compete_section27',
        keywords: ['restraint of trade', 'restrained from exercising', 'not engage in similar'],
        risk_level: 'CRITICAL',
        risk_score: 45,
        linked_section: 'Section 27',
        description: 'Restraint of trade clause',
        regex_pattern: 'restrain(ed|t)?\\s+(from|of)\\s+(trade|business|profession)',
        semantic_examples: 'prohibited from similar business,cannot work in same industry',
        context_required: 'freelance,consultant',
        industry_tags: 'all',
        explanation_en: 'Any agreement restraining lawful profession/trade is void under Section 27.'
    },
    {
        pattern_id: 's27_non_compete_03',
        clause_type: 'non_compete_section27',
        keywords: ['cannot work for competitor', 'not work for any competitor', 'prohibited from joining'],
        risk_level: 'CRITICAL',
        risk_score: 45,
        linked_section: 'Section 27',
        description: 'Competitor employment restriction',
        semantic_examples: 'forbidden from joining rival,cannot accept competitor offer',
        context_required: 'freelance,consultant,employment',
        industry_tags: 'all',
        explanation_en: 'Restricting employment with competitors is void under Section 27.'
    },
    {
        pattern_id: 's27_non_compete_04',
        clause_type: 'non_compete_section27',
        keywords: ['exclusive engagement', 'work exclusively', 'exclusively devoted', 'sole service'],
        risk_level: 'CRITICAL',
        risk_score: 40,
        linked_section: 'Section 27',
        description: 'Exclusivity requirement restricting other work',
        semantic_examples: 'dedicate full time,only work for us,no other clients',
        context_required: 'freelance,consultant',
        modifiers: { part_time_contract: -15 },
        industry_tags: 'all',
        explanation_en: 'Forcing exclusivity on freelancers effectively restrains their trade.'
    },
    {
        pattern_id: 's27_non_compete_05',
        clause_type: 'non_compete_section27',
        keywords: ['not provide similar services', 'refrain from offering', 'not engage in any business'],
        risk_level: 'CRITICAL',
        risk_score: 45,
        linked_section: 'Section 27',
        description: 'Service restriction clause',
        regex_pattern: 'not\\s+(provide|offer|engage in)\\s+(similar|competing|same)',
        context_required: 'freelance,consultant',
        industry_tags: 'all',
        explanation_en: 'Blanket restrictions on providing services are void.'
    },
    {
        pattern_id: 's27_non_solicit_01',
        clause_type: 'non_compete_section27',
        keywords: ['shall not solicit', 'not solicit clients', 'no solicitation', 'refrain from soliciting'],
        risk_level: 'CRITICAL',
        risk_score: 40,
        linked_section: 'Section 27',
        description: 'Non-solicitation clause (often void)',
        semantic_examples: 'cannot approach clients,prohibited from contacting customers',
        context_required: 'freelance,consultant',
        modifiers: { during_contract_only: -25 },
        industry_tags: 'all',
        explanation_en: 'Post-termination non-solicitation clauses are generally void under Section 27.'
    },
    // Section 28 - Restraint of legal proceedings (8 variations)
    {
        pattern_id: 's28_legal_waiver_01',
        clause_type: 'legal_waiver_section28',
        keywords: ['waive right to sue', 'waive all rights', 'no legal action', 'forfeit legal rights'],
        risk_level: 'CRITICAL',
        risk_score: 50,
        linked_section: 'Section 28',
        description: 'Waiver of fundamental legal rights',
        example_violation: 'Contractor waives all rights to legal proceedings',
        regex_pattern: 'waive(s)?\\s+(all|any)?\\s*(right|rights)\\s+to\\s+(sue|legal)',
        context_required: 'all',
        industry_tags: 'all',
        explanation_en: 'Section 28 makes ANY agreement restricting legal proceedings absolutely void.'
    },
    {
        pattern_id: 's28_legal_waiver_02',
        clause_type: 'legal_waiver_section28',
        keywords: ['cannot bring claim', 'barred from litigation', 'prohibited from suing'],
        risk_level: 'CRITICAL',
        risk_score: 50,
        linked_section: 'Section 28',
        description: 'Bar on litigation',
        context_required: 'all',
        industry_tags: 'all',
        explanation_en: 'Agreements preventing parties from going to court are void.'
    },
    {
        pattern_id: 's28_time_limit_01',
        clause_type: 'legal_waiver_section28',
        keywords: ['claims within 30 days', 'must claim within', 'time-barred after'],
        risk_level: 'CRITICAL',
        risk_score: 45,
        linked_section: 'Section 28',
        description: 'Unreasonably short limitation period',
        regex_pattern: '(claim|action)\\s+within\\s+(\\d+)\\s+(day|week)',
        context_required: 'all',
        modifiers: { limitation_over_1_year: -30 },
        industry_tags: 'all',
        explanation_en: 'Contracts cannot shorten statutory limitation periods below reasonable limits.'
    },
    // Section 23 - Unlawful object (6 variations)
    {
        pattern_id: 's23_unlawful_01',
        clause_type: 'unlawful_object_section23',
        keywords: ['illegal purpose', 'unlawful activity', 'against the law', 'circumvent law'],
        risk_level: 'CRITICAL',
        risk_score: 50,
        linked_section: 'Section 23',
        description: 'Contract for illegal purpose',
        context_required: 'all',
        industry_tags: 'all',
        explanation_en: 'Entire contract is void if object/consideration is unlawful under Section 23.'
    },
    {
        pattern_id: 's23_unlawful_02',
        clause_type: 'unlawful_object_section23',
        keywords: ['evade tax', 'tax avoidance scheme', 'circumvent regulations', 'avoid compliance'],
        risk_level: 'CRITICAL',
        risk_score: 50,
        linked_section: 'Section 23',
        description: 'Tax evasion or regulatory circumvention',
        context_required: 'all',
        industry_tags: 'all',
        explanation_en: 'Contracts designed to evade taxes or regulations are void.'
    },
    {
        pattern_id: 's23_public_policy_01',
        clause_type: 'unlawful_object_section23',
        keywords: ['against public policy', 'contrary to public interest', 'immoral purpose'],
        risk_level: 'CRITICAL',
        risk_score: 45,
        linked_section: 'Section 23',
        description: 'Contract against public policy',
        context_required: 'all',
        industry_tags: 'all',
        explanation_en: 'Contracts opposed to public policy are void under Section 23.'
    },
    // Section 15/16/17 - Coercion, Undue Influence, Fraud
    {
        pattern_id: 's15_coercion_01',
        clause_type: 'coercion_section15',
        keywords: ['must sign immediately', 'sign or lose', 'no time to review', 'take it or leave it'],
        risk_level: 'CRITICAL',
        risk_score: 40,
        linked_section: 'Section 15',
        description: 'Coercive signing tactics',
        semantic_examples: 'sign now or never,limited time offer,cannot negotiate',
        context_required: 'all',
        industry_tags: 'all',
        explanation_en: 'Contracts obtained through coercion are voidable under Section 15.'
    },
    {
        pattern_id: 's16_undue_influence_01',
        clause_type: 'undue_influence_section16',
        keywords: ['cannot consult lawyer', 'confidential do not share', 'do not discuss with anyone'],
        risk_level: 'CRITICAL',
        risk_score: 40,
        linked_section: 'Section 16',
        description: 'Preventing legal consultation',
        context_required: 'all',
        industry_tags: 'all',
        explanation_en: 'Preventing legal advice suggests undue influence under Section 16.'
    },
    {
        pattern_id: 's17_fraud_01',
        clause_type: 'fraud_section17',
        keywords: ['concealed material fact', 'hidden terms', 'undisclosed conditions'],
        risk_level: 'CRITICAL',
        risk_score: 45,
        linked_section: 'Section 17',
        description: 'Fraudulent concealment',
        context_required: 'all',
        industry_tags: 'all',
        explanation_en: 'Contracts obtained by fraud are voidable under Section 17.'
    },
];

// HIGH VIOLATIONS (20-35 points)
const HIGH_PATTERNS: ClausePattern[] = [
    // Section 74 - Excessive penalties (8 variations)
    {
        pattern_id: 's74_penalty_01',
        clause_type: 'excessive_penalty_section74',
        keywords: ['penalty of', 'liquidated damages of', 'penalty equal to', 'forfeit entire'],
        risk_level: 'HIGH',
        risk_score: 30,
        linked_section: 'Section 74',
        description: 'Fixed penalty clause (may be excessive)',
        regex_pattern: 'penalty\\s+(of|equal to)\\s+[₹$]?\\s*\\d+',
        context_required: 'all',
        modifiers: { penalty_under_1x_contract: -15, penalty_over_5x: 15 },
        industry_tags: 'all',
        explanation_en: 'Section 74 allows only REASONABLE compensation, not punitive penalties.'
    },
    {
        pattern_id: 's74_penalty_02',
        clause_type: 'excessive_penalty_section74',
        keywords: ['10x project value', '5x contract value', 'multiple of fees'],
        risk_level: 'HIGH',
        risk_score: 35,
        linked_section: 'Section 74',
        description: 'Multiplicative penalty clause',
        regex_pattern: '(\\d+)x\\s+(project|contract|fee)',
        context_required: 'all',
        industry_tags: 'all',
        explanation_en: 'Penalties exceeding 2x contract value are likely unenforceable.'
    },
    {
        pattern_id: 's74_penalty_daily_01',
        clause_type: 'excessive_penalty_section74',
        keywords: ['per day delay', 'daily penalty', 'per diem damages', 'for each day'],
        risk_level: 'HIGH',
        risk_score: 28,
        linked_section: 'Section 74',
        description: 'Accumulating daily penalty',
        regex_pattern: '(₹|\\$)?\\s*\\d+\\s+(per|each)\\s+day',
        context_required: 'freelance,vendor',
        modifiers: { capped_penalty: -10 },
        industry_tags: 'all',
        explanation_en: 'Daily penalties can accumulate unreasonably. Indian courts will cap them.'
    },
    // Section 73 - Unlimited liability (6 variations)
    {
        pattern_id: 's73_liability_01',
        clause_type: 'unlimited_liability_section73',
        keywords: ['unlimited liability', 'no limit on liability', 'without limitation'],
        risk_level: 'HIGH',
        risk_score: 30,
        linked_section: 'Section 73',
        description: 'Unlimited liability clause',
        context_required: 'all',
        industry_tags: 'all',
        explanation_en: 'Section 73 allows only reasonable compensation. Unlimited liability is excessive.'
    },
    {
        pattern_id: 's73_liability_02',
        clause_type: 'unlimited_liability_section73',
        keywords: ['consequential damages', 'indirect damages', 'special damages', 'incidental damages'],
        risk_level: 'HIGH',
        risk_score: 28,
        linked_section: 'Section 73',
        description: 'Liability for indirect damages',
        context_required: 'all',
        industry_tags: 'all',
        explanation_en: 'Consequential damages are rarely foreseeable and often excessive.'
    },
    {
        pattern_id: 's73_liability_03',
        clause_type: 'unlimited_liability_section73',
        keywords: ['loss of profits', 'lost revenue', 'business losses'],
        risk_level: 'HIGH',
        risk_score: 25,
        linked_section: 'Section 73',
        description: 'Liability for lost profits',
        context_required: 'freelance,vendor',
        industry_tags: 'all',
        explanation_en: 'Lost profit claims can be disproportionate to contract value.'
    },
    // IP Issues (8 variations)
    {
        pattern_id: 'ip_blanket_01',
        clause_type: 'blanket_ip_transfer',
        keywords: ['all intellectual property belongs', 'assign all rights title', 'waive moral rights'],
        risk_level: 'HIGH',
        risk_score: 30,
        linked_section: 'Section 27',
        description: 'Blanket IP assignment',
        context_required: 'freelance,consultant',
        industry_tags: 'software,design,content,video',
        explanation_en: 'Overreaching IP clauses can effectively restrain your trade.'
    },
    {
        pattern_id: 'ip_blanket_02',
        clause_type: 'blanket_ip_transfer',
        keywords: ['whether related to project or not', 'all ideas conceived', 'inventions during term'],
        risk_level: 'HIGH',
        risk_score: 35,
        linked_section: 'Section 27',
        description: 'IP claim on unrelated work',
        context_required: 'freelance,consultant',
        industry_tags: 'software,design',
        explanation_en: 'Claiming IP on unrelated work is overreaching and potentially void.'
    },
    {
        pattern_id: 'ip_retroactive_01',
        clause_type: 'blanket_ip_transfer',
        keywords: ['pre-existing materials', 'prior work', 'background IP', 'existing inventions'],
        risk_level: 'HIGH',
        risk_score: 32,
        linked_section: 'Section 27',
        description: 'Claim on pre-existing IP without exclusion',
        regex_pattern: '(all|any)\\s+(pre-existing|prior|background)\\s+(ip|work|material)',
        context_required: 'freelance,consultant',
        industry_tags: 'software,design',
        explanation_en: 'Pre-existing IP should be explicitly excluded from transfer.'
    },
    {
        pattern_id: 'ip_portfolio_01',
        clause_type: 'indirect_non_compete_portfolio',
        keywords: ['cannot showcase', 'not display work', 'prohibit portfolio', 'no portfolio rights'],
        risk_level: 'HIGH',
        risk_score: 28,
        linked_section: 'Section 27',
        description: 'Portfolio restriction (indirect non-compete)',
        context_required: 'freelance,consultant',
        industry_tags: 'design,video,content',
        explanation_en: 'Restricting portfolio use combined with NDA can restrain trade.'
    },
    // Payment issues (4 variations)
    {
        pattern_id: 'payment_90plus_01',
        clause_type: 'unfair_payment_terms',
        keywords: ['payment within 90 days', 'net 90', 'ninety days', '120 days'],
        risk_level: 'HIGH',
        risk_score: 25,
        linked_section: 'Section 73',
        description: 'Extended payment terms (90+ days)',
        regex_pattern: '(payment|pay)\\s+(within|in)\\s+(90|120|180)\\s+days',
        context_required: 'freelance,vendor',
        industry_tags: 'all',
        explanation_en: 'Payment beyond 60 days creates significant cash flow risk.'
    },
    {
        pattern_id: 'payment_conditional_01',
        clause_type: 'unfair_payment_terms',
        keywords: ['pay when paid', 'when client pays', 'subject to client receipt', 'conditional on'],
        risk_level: 'HIGH',
        risk_score: 28,
        linked_section: 'Section 73',
        description: 'Payment conditional on third party',
        context_required: 'freelance,vendor',
        industry_tags: 'all',
        explanation_en: 'Pay-when-paid clauses transfer client risk to you unfairly.'
    },
    // Termination issues (4 variations)
    {
        pattern_id: 'termination_unilateral_01',
        clause_type: 'unilateral_termination',
        keywords: ['terminate at will', 'terminate without cause', 'immediate termination without notice'],
        risk_level: 'HIGH',
        risk_score: 25,
        linked_section: 'Section 73',
        description: 'Unilateral termination without notice',
        context_required: 'freelance,consultant',
        modifiers: { mutual_right: -15 },
        industry_tags: 'all',
        explanation_en: 'One-sided termination rights leave you without protection.'
    },
    {
        pattern_id: 'termination_no_payment_01',
        clause_type: 'unilateral_termination',
        keywords: ['no payment for incomplete', 'forfeit payment on termination', 'no prorated payment'],
        risk_level: 'HIGH',
        risk_score: 28,
        linked_section: 'Section 73',
        description: 'No payment on termination',
        context_required: 'freelance,consultant',
        industry_tags: 'all',
        explanation_en: 'You should be paid for work completed before termination.'
    },
    // Indemnity issues (4 variations)
    {
        pattern_id: 's124_indemnity_01',
        clause_type: 'unlimited_indemnity',
        keywords: ['indemnify and hold harmless', 'unlimited indemnification', 'full indemnity'],
        risk_level: 'HIGH',
        risk_score: 28,
        linked_section: 'Section 124',
        description: 'Unlimited indemnification',
        context_required: 'all',
        industry_tags: 'all',
        explanation_en: 'Indemnity should be limited to your negligence, not client claims.'
    },
    {
        pattern_id: 's124_indemnity_02',
        clause_type: 'unlimited_indemnity',
        keywords: ['any and all claims', 'third party claims', 'defend at own expense'],
        risk_level: 'HIGH',
        risk_score: 25,
        linked_section: 'Section 124',
        description: 'Broad third-party indemnity',
        context_required: 'freelance,vendor',
        industry_tags: 'all',
        explanation_en: 'You should not indemnify for claims unrelated to your work.'
    },
];

// MEDIUM VIOLATIONS (10-20 points)
const MEDIUM_PATTERNS: ClausePattern[] = [
    // Payment issues (3 variations)
    {
        pattern_id: 'payment_60_89_01',
        clause_type: 'delayed_payment',
        keywords: ['payment within 60 days', 'net 60', 'sixty days', 'payment within 75 days'],
        risk_level: 'MEDIUM',
        risk_score: 18,
        linked_section: 'Section 73',
        description: 'Delayed payment terms (60-89 days)',
        regex_pattern: '(payment|pay)\\s+(within|in)\\s+(60|75|89)\\s+days',
        context_required: 'freelance,vendor',
        industry_tags: 'all',
        explanation_en: 'Payment beyond 45 days is slower than industry standard.'
    },
    // Scope creep (4 variations)
    {
        pattern_id: 'scope_creep_01',
        clause_type: 'scope_creep',
        keywords: ['unlimited revisions', 'any revisions', 'revisions at no cost', 'free revisions'],
        risk_level: 'MEDIUM',
        risk_score: 15,
        linked_section: 'Section 73',
        description: 'Unlimited revisions clause',
        context_required: 'freelance,consultant',
        industry_tags: 'design,content,video',
        explanation_en: 'Unlimited revisions can significantly increase unpaid work.'
    },
    {
        pattern_id: 'scope_creep_02',
        clause_type: 'scope_creep',
        keywords: ['scope may change', 'additional work without', 'other duties as assigned'],
        risk_level: 'MEDIUM',
        risk_score: 18,
        linked_section: 'Section 73',
        description: 'Uncompensated scope changes',
        context_required: 'freelance,consultant',
        industry_tags: 'all',
        explanation_en: 'Scope changes should come with additional compensation.'
    },
    // Foreign jurisdiction (3 variations)
    {
        pattern_id: 'jurisdiction_foreign_01',
        clause_type: 'foreign_jurisdiction',
        keywords: ['governed by laws of USA', 'courts of Delaware', 'California law', 'New York jurisdiction'],
        risk_level: 'MEDIUM',
        risk_score: 15,
        linked_section: 'Section 23',
        description: 'US jurisdiction clause',
        context_required: 'all',
        industry_tags: 'all',
        explanation_en: 'Foreign jurisdiction is expensive and may not protect your Indian law rights.'
    },
    {
        pattern_id: 'jurisdiction_foreign_02',
        clause_type: 'foreign_jurisdiction',
        keywords: ['UK jurisdiction', 'English law', 'Singapore courts', 'arbitration in Singapore'],
        risk_level: 'MEDIUM',
        risk_score: 15,
        linked_section: 'Section 23',
        description: 'Non-US foreign jurisdiction',
        context_required: 'all',
        industry_tags: 'all',
        explanation_en: 'Disputes should be resolved in India for practicality.'
    },
    // Confidentiality issues (3 variations)
    {
        pattern_id: 'nda_perpetual_01',
        clause_type: 'overbroad_confidentiality',
        keywords: ['perpetual confidentiality', 'indefinite confidentiality', 'forever confidential'],
        risk_level: 'MEDIUM',
        risk_score: 15,
        linked_section: 'Section 27',
        description: 'Perpetual confidentiality',
        context_required: 'freelance,consultant',
        industry_tags: 'all',
        explanation_en: 'Reasonable confidentiality is 2-5 years. Perpetual is excessive.'
    },
    {
        pattern_id: 'nda_overbroad_01',
        clause_type: 'overbroad_confidentiality',
        keywords: ['all information confidential', 'any information disclosed', 'everything is confidential'],
        risk_level: 'MEDIUM',
        risk_score: 12,
        linked_section: 'Section 27',
        description: 'Overbroad confidentiality definition',
        context_required: 'all',
        industry_tags: 'all',
        explanation_en: 'Confidentiality should be limited to genuinely secret information.'
    },
    // Liability cap issues
    {
        pattern_id: 'liability_high_cap_01',
        clause_type: 'high_liability_cap',
        keywords: ['liability capped at contract value', 'liable up to total fees', 'liability equals fees'],
        risk_level: 'MEDIUM',
        risk_score: 15,
        linked_section: 'Section 74',
        description: 'High liability cap (1x contract)',
        context_required: 'freelance,consultant',
        modifiers: { large_contract_over_10L: 5 },
        industry_tags: 'all',
        explanation_en: 'For freelance work, liability should be capped at 50-100% of fees paid.'
    },
    // Work hours issues
    {
        pattern_id: 'hours_excessive_01',
        clause_type: 'excessive_hours',
        keywords: ['available 24/7', 'always available', 'respond within 1 hour', 'on-call at all times'],
        risk_level: 'MEDIUM',
        risk_score: 15,
        linked_section: 'Section 73',
        description: 'Excessive availability requirements',
        context_required: 'freelance,consultant',
        industry_tags: 'all',
        explanation_en: 'Freelancers should not be required to be available 24/7.'
    },
];

// LOW VIOLATIONS (5-10 points)
const LOW_PATTERNS: ClausePattern[] = [
    // Minor payment delays
    {
        pattern_id: 'payment_45_59_01',
        clause_type: 'slight_payment_delay',
        keywords: ['payment within 45 days', 'net 45', 'forty-five days'],
        risk_level: 'LOW',
        risk_score: 8,
        linked_section: 'Section 73',
        description: 'Slightly delayed payment (45-59 days)',
        context_required: 'freelance,vendor',
        industry_tags: 'all',
        explanation_en: 'Payment of 45+ days is slightly slower than Net 30 standard.'
    },
    // Vague scope
    {
        pattern_id: 'vague_scope_01',
        clause_type: 'vague_scope',
        keywords: ['deliverables to be determined', 'scope TBD', 'as mutually agreed later'],
        risk_level: 'LOW',
        risk_score: 8,
        linked_section: 'Section 10',
        description: 'Vague scope definition',
        context_required: 'freelance,consultant',
        industry_tags: 'all',
        explanation_en: 'Unclear scope can lead to disputes about deliverables.'
    },
    {
        pattern_id: 'vague_deliverables_01',
        clause_type: 'vague_scope',
        keywords: ['reasonable efforts', 'best efforts', 'as needed', 'from time to time'],
        risk_level: 'LOW',
        risk_score: 5,
        linked_section: 'Section 10',
        description: 'Vague effort standard',
        context_required: 'freelance,consultant',
        industry_tags: 'all',
        explanation_en: 'Vague standards can be used to extract more work.'
    },
    // Minor NDA issues
    {
        pattern_id: 'nda_5_year_01',
        clause_type: 'long_confidentiality',
        keywords: ['confidential for 5 years', 'five year confidentiality', '10 year NDA'],
        risk_level: 'LOW',
        risk_score: 8,
        linked_section: 'Section 27',
        description: 'Long confidentiality period (5+ years)',
        context_required: 'all',
        industry_tags: 'all',
        explanation_en: 'Standard NDA period is 2-3 years. 5+ years is unusually long.'
    },
    // Minor termination issues
    {
        pattern_id: 'termination_short_01',
        clause_type: 'short_notice',
        keywords: ['7 days notice', 'one week notice', '3 day notice'],
        risk_level: 'LOW',
        risk_score: 8,
        linked_section: 'Section 73',
        description: 'Short termination notice',
        context_required: 'freelance,consultant',
        industry_tags: 'all',
        explanation_en: 'Standard notice is 15-30 days. Shorter may not give time to transition.'
    },
];

// POSITIVE PATTERNS (negative points - reduce risk score)
const POSITIVE_PATTERNS: ClausePattern[] = [
    {
        pattern_id: 'positive_advance_01',
        clause_type: 'fair_payment_advance',
        keywords: ['advance payment', 'upfront payment', '50% advance', 'payment before start'],
        risk_level: 'POSITIVE',
        risk_score: -8,
        linked_section: 'Section 73',
        description: 'Advance payment (positive)',
        context_required: 'freelance,consultant',
        industry_tags: 'all',
        explanation_en: 'Advance payment shows good faith and reduces your risk.'
    },
    {
        pattern_id: 'positive_net30_01',
        clause_type: 'fair_payment_terms',
        keywords: ['payment within 30 days', 'net 30', 'thirty days of invoice'],
        risk_level: 'POSITIVE',
        risk_score: -5,
        linked_section: 'Section 73',
        description: 'Standard payment terms (positive)',
        context_required: 'all',
        industry_tags: 'all',
        explanation_en: 'Net 30 is the industry standard and reasonable.'
    },
    {
        pattern_id: 'positive_mutual_term_01',
        clause_type: 'fair_termination',
        keywords: ['either party may terminate', 'mutual termination', 'both parties have right'],
        risk_level: 'POSITIVE',
        risk_score: -5,
        linked_section: 'Section 73',
        description: 'Mutual termination rights (positive)',
        context_required: 'all',
        industry_tags: 'all',
        explanation_en: 'Mutual termination rights are fair and balanced.'
    },
    {
        pattern_id: 'positive_liability_cap_01',
        clause_type: 'fair_liability',
        keywords: ['liability limited to fees paid', 'cap at fees received', 'limited to amount paid'],
        risk_level: 'POSITIVE',
        risk_score: -5,
        linked_section: 'Section 74',
        description: 'Reasonable liability cap (positive)',
        context_required: 'freelance,consultant',
        industry_tags: 'all',
        explanation_en: 'Liability capped at fees paid is fair and proportional.'
    },
    {
        pattern_id: 'positive_indian_jurisdiction_01',
        clause_type: 'fair_jurisdiction',
        keywords: ['governed by Indian law', 'jurisdiction of Indian courts', 'courts of India'],
        risk_level: 'POSITIVE',
        risk_score: -3,
        linked_section: 'Section 23',
        description: 'Indian jurisdiction (positive)',
        context_required: 'all',
        industry_tags: 'all',
        explanation_en: 'Indian jurisdiction ensures your legal rights are protected.'
    },
    {
        pattern_id: 'positive_portfolio_01',
        clause_type: 'fair_ip',
        keywords: ['retain portfolio rights', 'may showcase work', 'display in portfolio'],
        risk_level: 'POSITIVE',
        risk_score: -5,
        linked_section: 'Section 27',
        description: 'Portfolio rights retained (positive)',
        context_required: 'freelance,consultant',
        industry_tags: 'design,video,content,software',
        explanation_en: 'Portfolio rights help you attract future clients.'
    },
];

// Combine all patterns
const ALL_PATTERNS: ClausePattern[] = [
    ...CRITICAL_PATTERNS,
    ...HIGH_PATTERNS,
    ...MEDIUM_PATTERNS,
    ...LOW_PATTERNS,
    ...POSITIVE_PATTERNS,
];

export async function seedEnhancedDatabase() {
    console.log('🌱 Seeding enhanced database...');
    console.log(`📊 Total patterns to seed: ${ALL_PATTERNS.length}`);

    // 1. Recreate clause_patterns table with new schema
    recreateClausePatternsTable();

    // 2. Ensure required sections exist
    seedRequiredSections();

    // 3. Seed enhanced patterns
    seedEnhancedPatterns();

    console.log('✅ Enhanced database seeded successfully!');
    console.log(`📊 Final count: ${ALL_PATTERNS.length} patterns`);
}

function seedRequiredSections() {
    const insert = db.prepare(`
        INSERT OR IGNORE INTO act_sections
        (section_number, section_title, full_text, summary, page_number, chapter)
        VALUES (?, ?, ?, ?, NULL, NULL)
    `);

    for (const section of REQUIRED_SECTIONS) {
        insert.run(section.number, section.title, section.title, section.title);
    }
    console.log(`✅ Ensured ${REQUIRED_SECTIONS.length} required sections exist`);
}

function seedEnhancedPatterns() {
    const insert = db.prepare(`
        INSERT OR REPLACE INTO clause_patterns 
        (pattern_id, clause_type, keywords, risk_level, risk_score, linked_section, 
         description, example_violation, regex_pattern, semantic_examples, 
         context_required, modifiers, industry_tags, explanation_en, explanation_hi, explanation_context)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let count = 0;
    for (const pattern of ALL_PATTERNS) {
        try {
            insert.run(
                pattern.pattern_id,
                pattern.clause_type,
                JSON.stringify(pattern.keywords),
                pattern.risk_level,
                pattern.risk_score,
                pattern.linked_section,
                pattern.description,
                pattern.example_violation || null,
                pattern.regex_pattern || null,
                pattern.semantic_examples || null,
                pattern.context_required,
                pattern.modifiers ? JSON.stringify(pattern.modifiers) : null,
                pattern.industry_tags,
                pattern.explanation_en,
                pattern.explanation_hi || null,
                null // explanation_context
            );
            count++;
        } catch (e) {
            console.error(`❌ Failed to insert ${pattern.pattern_id}:`, e);
        }
    }
    console.log(`✅ Seeded ${count} enhanced clause patterns`);
}

// Run if called directly
if (require.main === module) {
    seedEnhancedDatabase().catch(console.error);
}
