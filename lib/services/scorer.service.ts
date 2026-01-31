/**
 * Enhanced Scoring Service
 * Context-aware risk scoring based on Indian Contract Act
 * 
 * Features:
 * - Industry-specific weights (freelance vs employment)
 * - Contract value modifiers
 * - Duration modifiers
 * - Clause-specific modifiers
 */

import type { IndianLawViolation } from '../types/contract.types';

// ============================================================
// CONTRACT CONTEXT TYPES
// ============================================================

export interface ContractContext {
    contractType: 'freelance' | 'employment' | 'vendor' | 'consultant' | 'general';
    industry: 'software' | 'design' | 'writing' | 'video' | 'marketing' | 'general';
    contractValue?: number;      // In INR
    durationMonths?: number;
    userExperience?: number;     // Years
}

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SAFE';

export interface ScoringResult {
    score: number;
    level: RiskLevel;
    breakdown: Record<string, number>;
    explanation: string;
}

// ============================================================
// INDUSTRY-SPECIFIC WEIGHTS
// ============================================================

const INDUSTRY_WEIGHTS: Record<string, Record<string, number>> = {
    freelance: {
        'Section 27': 1.5,      // Non-compete is CRITICAL for freelancers
        'Section 28': 1.3,      // Legal rights critical
        'Section 74': 1.3,      // Penalties hit harder
        'Section 73': 1.2,      // Liability matters
        'payment': 1.4,         // Cash flow is critical
        'ip': 1.2,              // IP is main asset
        'termination': 1.3,     // Need stability
    },
    employment: {
        'Section 27': 0.7,      // Non-compete less impactful (salary continues)
        'Section 28': 1.2,
        'Section 74': 1.0,
        'Section 73': 1.0,
        'payment': 0.8,         // Salary is guaranteed
        'ip': 0.9,
        'termination': 1.0,
        'hours': 1.5,           // Working hours more relevant
    },
    vendor: {
        'Section 27': 0.8,
        'Section 74': 1.2,
        'Section 73': 1.3,      // Liability critical for vendors
        'payment': 1.3,
        'ip': 0.7,
        'termination': 1.0,
    },
    consultant: {
        'Section 27': 1.4,
        'Section 28': 1.3,
        'Section 74': 1.2,
        'Section 73': 1.1,
        'payment': 1.3,
        'ip': 1.1,
        'termination': 1.2,
    },
    general: {
        // Default weights (1.0 for all)
    },
};

// ============================================================
// BASE SCORES BY VIOLATION TYPE
// ============================================================

const BASE_SCORES: Record<string, { base: number; modifiers?: Record<string, number> }> = {
    // Section 27 - Non-compete
    'non_compete_section27': {
        base: 45,
        modifiers: {
            goodwill_sale_exception: -20,
            affects_livelihood: 10,
            limited_duration: -5,
        }
    },
    // Section 28 - Legal waiver
    'legal_waiver_section28': {
        base: 50,
    },
    // Section 23 - Unlawful object
    'unlawful_object_section23': {
        base: 50,
    },
    // Section 74 - Penalties
    'excessive_penalty_section74': {
        base: 28,
        modifiers: {
            penalty_over_5x: 15,
            penalty_under_1x: -10,
            accumulating_penalty: 8,
        }
    },
    // Section 73 - Liability
    'unlimited_liability_section73': {
        base: 28,
        modifiers: {
            consequential_damages: 5,
            capped_liability: -10,
        }
    },
    // IP issues
    'blanket_ip_transfer': {
        base: 30,
        modifiers: {
            includes_preexisting: 5,
            portfolio_rights_retained: -8,
        }
    },
    'indirect_non_compete_portfolio': {
        base: 28,
    },
    // Payment issues
    'unfair_payment_terms': {
        base: 25,
        modifiers: {
            pay_when_paid: 5,
            over_90_days: 8,
            advance_payment: -10,
        }
    },
    'delayed_payment': {
        base: 18,
    },
    'slight_payment_delay': {
        base: 8,
    },
    // Termination
    'unilateral_termination': {
        base: 25,
        modifiers: {
            no_payment_on_termination: 8,
            mutual_right: -12,
        }
    },
    // Indemnity
    'unlimited_indemnity': {
        base: 28,
    },
    // Scope
    'scope_creep': {
        base: 15,
    },
    'vague_scope': {
        base: 8,
    },
    // Jurisdiction
    'foreign_jurisdiction': {
        base: 15,
    },
    // NDA
    'overbroad_confidentiality': {
        base: 12,
    },
    'long_confidentiality': {
        base: 8,
    },
    // Coercion/Fraud
    'coercion_section15': {
        base: 40,
    },
    'undue_influence_section16': {
        base: 40,
    },
    'fraud_section17': {
        base: 45,
    },
    // Positive patterns (reduce score)
    'fair_payment_advance': {
        base: -8,
    },
    'fair_payment_terms': {
        base: -5,
    },
    'fair_termination': {
        base: -5,
    },
    'fair_liability': {
        base: -5,
    },
    'fair_jurisdiction': {
        base: -3,
    },
    'fair_ip': {
        base: -5,
    },
};

// ============================================================
// MODIFIER FUNCTIONS
// ============================================================

/**
 * Get contract value modifier
 * Higher value contracts get higher risk awareness
 */
function getContractValueModifier(value?: number): number {
    if (!value) return 1.0;
    if (value >= 1000000) return 1.3;   // ₹10L+
    if (value >= 500000) return 1.2;    // ₹5-10L
    if (value >= 100000) return 1.1;    // ₹1-5L
    return 1.0;
}

/**
 * Get duration modifier
 * Longer contracts have more at stake
 */
function getDurationModifier(months?: number): number {
    if (!months) return 1.0;
    if (months >= 12) return 1.2;   // 1+ year
    if (months >= 6) return 1.1;    // 6-12 months
    return 1.0;
}

/**
 * Get industry weight for a specific section/type
 */
function getIndustryWeight(
    section: string,
    violationType: string,
    contractType: string
): number {
    const weights = INDUSTRY_WEIGHTS[contractType] || {};

    // Check section first
    if (weights[section]) return weights[section];

    // Check violation type category
    if (violationType.includes('payment') && weights['payment']) return weights['payment'];
    if (violationType.includes('ip') && weights['ip']) return weights['ip'];
    if (violationType.includes('termination') && weights['termination']) return weights['termination'];
    if (violationType.includes('hours') && weights['hours']) return weights['hours'];

    return 1.0; // Default weight
}

// ============================================================
// MAIN SCORING CLASS
// ============================================================

export class EnhancedScoringService {
    /**
     * Calculate score for a single violation with context
     */
    calculateViolationScore(
        violation: IndianLawViolation,
        context: ContractContext
    ): number {
        // Get base score
        const baseConfig = BASE_SCORES[violation.violationType];
        let score = baseConfig?.base ?? violation.riskScore;

        // Apply text-based modifiers
        score = this.applyTextModifiers(score, violation);

        // Apply industry weight
        const industryWeight = getIndustryWeight(
            violation.sectionNumber,
            violation.violationType,
            context.contractType
        );
        score *= industryWeight;

        // Apply contract value modifier
        score *= getContractValueModifier(context.contractValue);

        // Apply duration modifier
        score *= getDurationModifier(context.durationMonths);

        // Cap individual violations at 50
        return Math.min(Math.round(score), 50);
    }

    /**
     * Apply modifiers based on clause text content
     */
    private applyTextModifiers(baseScore: number, violation: IndianLawViolation): number {
        const text = violation.clauseText.toLowerCase();
        let score = baseScore;

        // Section 27 specific modifiers
        if (violation.sectionNumber === 'Section 27') {
            // Goodwill sale exception
            if (text.includes('goodwill') && text.includes('sale')) {
                score -= 20;
            }
            // Affects livelihood
            if (text.includes('not work') || text.includes('not engage') || text.includes('not provide')) {
                score += 5;
            }
        }

        // Section 74 penalty modifiers
        if (violation.violationType.includes('penalty')) {
            // Check for multiplier
            const multiplierMatch = text.match(/(\d+)x/);
            if (multiplierMatch) {
                const multiple = parseInt(multiplierMatch[1]);
                if (multiple >= 5) score += 15;
                else if (multiple >= 3) score += 8;
            }
            // Accumulating penalty
            if (text.includes('per day') || text.includes('per hour') || text.includes('daily')) {
                score += 8;
            }
        }

        // Payment term modifiers
        if (violation.violationType.includes('payment')) {
            // Extract days
            const daysMatch = text.match(/(\d+)\s*days/);
            if (daysMatch) {
                const days = parseInt(daysMatch[1]);
                if (days >= 120) score += 10;
                else if (days >= 90) score += 5;
            }
            // Positive: advance payment
            if (text.includes('advance') || text.includes('upfront') || text.includes('milestone')) {
                score -= 5;
            }
        }

        // Liability modifiers
        if (violation.violationType.includes('liability')) {
            if (text.includes('unlimited') || text.includes('no limit')) {
                score += 5;
            }
            if (text.includes('capped') || text.includes('limited to')) {
                score -= 5;
            }
        }

        return Math.max(score, 0); // Don't go negative for individual violations
    }

    /**
     * Calculate overall risk score from all violations
     */
    calculateOverallScore(
        violations: IndianLawViolation[],
        context: ContractContext
    ): ScoringResult {
        let totalScore = 0;
        const breakdown: Record<string, number> = {
            CRITICAL: 0,
            HIGH: 0,
            MEDIUM: 0,
            LOW: 0,
            POSITIVE: 0,
        };

        for (const violation of violations) {
            const score = this.calculateViolationScore(violation, context);
            totalScore += score;

            // Track breakdown
            if (score < 0) {
                breakdown.POSITIVE += Math.abs(score);
            } else if (score >= 40) {
                breakdown.CRITICAL += score;
            } else if (score >= 20) {
                breakdown.HIGH += score;
            } else if (score >= 10) {
                breakdown.MEDIUM += score;
            } else {
                breakdown.LOW += score;
            }
        }

        // Cap at 100
        totalScore = Math.min(Math.max(totalScore, 0), 100);

        // Determine risk level
        let level: RiskLevel;
        if (totalScore >= 75) level = 'CRITICAL';
        else if (totalScore >= 50) level = 'HIGH';
        else if (totalScore >= 25) level = 'MEDIUM';
        else if (totalScore > 0) level = 'LOW';
        else level = 'SAFE';

        // Generate explanation
        const explanation = this.generateScoreExplanation(totalScore, level, violations, context);

        return { score: totalScore, level, breakdown, explanation };
    }

    /**
     * Generate human-readable explanation of the score
     */
    generateScoreExplanation(
        score: number,
        level: RiskLevel,
        violations: IndianLawViolation[],
        context: ContractContext
    ): string {
        const criticalCount = violations.filter(v => v.riskLevel === 'CRITICAL').length;
        const highCount = violations.filter(v => v.riskLevel === 'HIGH').length;

        let explanation = '';

        if (level === 'CRITICAL') {
            explanation = `This contract has ${criticalCount} CRITICAL violation(s) that may render parts void under Indian law. `;
        } else if (level === 'HIGH') {
            explanation = `This contract poses significant risks with ${highCount} HIGH-risk clause(s). `;
        } else if (level === 'MEDIUM') {
            explanation = `This contract has some concerning clauses that should be negotiated. `;
        } else if (level === 'LOW') {
            explanation = `This contract has minor issues but is generally acceptable. `;
        } else {
            explanation = `This contract appears fair and balanced. `;
        }

        // Add context-specific notes
        if (context.contractType === 'freelance' && criticalCount > 0) {
            explanation += `As a freelancer, these issues are particularly concerning for your livelihood.`;
        }

        return explanation;
    }
}

// ============================================================
// LEGACY COMPATIBILITY FUNCTIONS
// ============================================================

/**
 * Legacy function - maintains backward compatibility
 * Used by existing API route
 */
export function calculateRiskScore(violations: IndianLawViolation[]): number {
    let totalScore = 0;
    for (const violation of violations) {
        totalScore += violation.riskScore;
    }
    return Math.min(totalScore, 100);
}

/**
 * Legacy function - maintains backward compatibility
 */
export function getRiskLevel(score: number): string {
    if (score >= 76) return 'DANGEROUS';
    if (score >= 51) return 'HIGH RISK';
    if (score >= 26) return 'MODERATE RISK';
    return 'SAFE';
}

// Export singleton instance
export const enhancedScorer = new EnhancedScoringService();
