// Type definitions for contract analysis

export interface ContractMetadata {
    characterCount: number;
    pageCount?: number;
    wordCount?: number;
}

export interface ExtractedText {
    text: string;
    metadata: ContractMetadata;
}

export interface Clause {
    id: number;
    text: string;
    position: number;
}

export interface IndianLawViolation {
    clauseId: number;
    clauseText: string;
    violationType: string;
    sectionNumber: string;
    sectionTitle: string;
    sectionFullText: string;
    riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    riskScore: number;
    matchedKeywords: string[];
    explanation: string;
    govUrl: string;
}

export interface Deviation {
    category: string;
    foundInContract: string;
    fairStandard: string;
    deviationLevel: 'EXTREME' | 'SIGNIFICANT' | 'MINOR';
    explanation: string;
    legalReference?: string;  // Indian Contract Act section reference
    aiSummary?: string;       // AI-generated plain-language explanation
    matchedText?: string;     // Actual text from contract (for highlighting)
}

export interface AnalysisResult {
    success: boolean;
    processingTimeMs: number;
    document: {
        fileName: string;
        fileSize: number;
        fileType: string;
        extractedCharacters: number;
        pageCount?: number;
    };
    analysis: {
        overallRiskScore: number;
        riskLevel: string;
        totalClauses: number;
        riskyClausesFound: number;
        deviationsFromFairContract: number;
        breakdown: {
            CRITICAL: number;
            HIGH: number;
            MEDIUM: number;
            LOW: number;
        };
    };
    riskyClauses: any[];
    deviations: Deviation[];
    disclaimer: string;
}

/**
 * Semantic search match result
 */
export interface SemanticMatch {
    clauseId: number;
    clauseText: string;
    matchedPattern: string;
    similarity: number;  // 0-1 score
    riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    riskScore: number;
    sectionNumber: string;
    sectionTitle: string;
    description: string;
    matchSource: 'semantic';
}

/**
 * Combined violation (from keyword OR semantic)
 */
export interface CombinedViolation {
    clauseId: number;
    clauseText: string;
    violationType: string;
    sectionNumber: string;
    sectionTitle: string;
    sectionFullText: string;
    riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    riskScore: number;
    matchedKeywords?: string[];      // Only for keyword matches
    semanticSimilarity?: number;     // Only for semantic matches
    matchSource: 'keyword' | 'semantic' | 'both';
    explanation: string;
    govUrl: string;
}

/**
 * User role for perspective-based explanations
 */
export type UserRole = 'freelancer' | 'company';

/**
 * Role-based explanation with both perspectives
 */
export interface RoleBasedExplanation {
    freelancer: {
        simple: string;
        realLifeImpact: string;
    };
    company: {
        simple: string;
        realLifeImpact: string;
    };
}

/**
 * Contract context for context-aware scoring
 */
export interface ContractContext {
    contractType: 'freelance' | 'employment' | 'vendor' | 'consultant' | 'general';
    industry: 'software' | 'design' | 'writing' | 'video' | 'marketing' | 'general';
    contractValue?: number;      // In INR
    durationMonths?: number;
    userExperience?: number;     // Years
}

