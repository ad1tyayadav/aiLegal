import { getAllFairContractBaselines } from '../db/queries';
import type { Clause, Deviation, ContractContext } from '../types/contract.types';

/**
 * Indian Contract Baselines by Contract Type
 * Based on industry standards and legal precedents
 */
export const INDIAN_BASELINES = {
    payment: {
        freelance: { standard: 30, warning: 45, danger: 60, critical: 90, unit: 'days' },
        employment: { standard: 30, warning: 45, danger: 60, critical: 90, unit: 'days' },
        vendor: { standard: 30, warning: 45, danger: 75, critical: 120, unit: 'days' },
        consultant: { standard: 30, warning: 45, danger: 60, critical: 90, unit: 'days' },
        general: { standard: 30, warning: 45, danger: 60, critical: 90, unit: 'days' },
    },
    notice_period: {
        freelance: { standard: 15, warning: 7, danger: 3, critical: 0, unit: 'days', direction: 'below' },
        employment: { standard: 30, warning: 60, danger: 90, critical: 120, unit: 'days', direction: 'above' },
        vendor: { standard: 30, warning: 15, danger: 7, critical: 0, unit: 'days', direction: 'below' },
        consultant: { standard: 15, warning: 7, danger: 3, critical: 0, unit: 'days', direction: 'below' },
        general: { standard: 15, warning: 7, danger: 3, critical: 0, unit: 'days', direction: 'below' },
    },
    liability_cap: {
        freelance: { standard: 1.0, warning: 2.0, danger: 3.0, critical: Infinity, unit: 'times_contract' },
        employment: { standard: 1.0, warning: 2.0, danger: 5.0, critical: Infinity, unit: 'times_contract' },
        vendor: { standard: 1.5, warning: 3.0, danger: 5.0, critical: Infinity, unit: 'times_contract' },
        consultant: { standard: 1.0, warning: 2.0, danger: 3.0, critical: Infinity, unit: 'times_contract' },
        general: { standard: 1.0, warning: 2.0, danger: 3.0, critical: Infinity, unit: 'times_contract' },
    },
    working_hours: {
        freelance: { standard: 40, warning: 45, danger: 50, critical: 60, unit: 'hours_per_week' },
        employment: { standard: 40, warning: 45, danger: 48, critical: 60, unit: 'hours_per_week' },
        vendor: { standard: 40, warning: 50, danger: 60, critical: 80, unit: 'hours_per_week' },
        consultant: { standard: 40, warning: 45, danger: 50, critical: 60, unit: 'hours_per_week' },
        general: { standard: 40, warning: 48, danger: 55, critical: 60, unit: 'hours_per_week' },
    },
    confidentiality_period: {
        freelance: { standard: 2, warning: 5, danger: 10, critical: Infinity, unit: 'years' },
        employment: { standard: 2, warning: 5, danger: 10, critical: Infinity, unit: 'years' },
        vendor: { standard: 3, warning: 5, danger: 10, critical: Infinity, unit: 'years' },
        consultant: { standard: 2, warning: 5, danger: 10, critical: Infinity, unit: 'years' },
        general: { standard: 2, warning: 5, danger: 10, critical: Infinity, unit: 'years' },
    },
};

/**
 * Enhanced Deviation Checker
 * Compares contract clauses against Indian fair contract baselines
 */
export class EnhancedDeviationChecker {
    /**
     * Check all deviations from fair contract baseline
     */
    check(contractText: string, context: ContractContext): Deviation[] {
        const deviations: Deviation[] = [];
        const text = contractText.toLowerCase();

        // Check payment terms
        const paymentDeviation = this.checkPaymentTerms(text, context);
        if (paymentDeviation) deviations.push(paymentDeviation);

        // Check notice period
        const noticeDeviation = this.checkNoticePeriod(text, context);
        if (noticeDeviation) deviations.push(noticeDeviation);

        // Check liability cap
        const liabilityDeviation = this.checkLiabilityCap(text, context);
        if (liabilityDeviation) deviations.push(liabilityDeviation);

        // Check working hours
        const hoursDeviation = this.checkWorkingHours(text, context);
        if (hoursDeviation) deviations.push(hoursDeviation);

        // Check confidentiality period
        const ndaDeviation = this.checkConfidentialityPeriod(text, context);
        if (ndaDeviation) deviations.push(ndaDeviation);

        // Check foreign jurisdiction
        const jurisdictionDeviation = this.checkJurisdiction(text);
        if (jurisdictionDeviation) deviations.push(jurisdictionDeviation);

        return deviations;
    }

    private checkPaymentTerms(text: string, context: ContractContext): Deviation | null {
        const patterns = [
            /payment\s+(?:within|in)\s+(\d+)\s*days/i,
            /net\s+(\d+)/i,
            /(\d+)\s*days?\s+(?:from|after|of)\s+(?:invoice|receipt|completion)/i,
            /pay(?:able)?\s+within\s+(\d+)\s*days/i,
        ];

        let days: number | null = null;
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                days = parseInt(match[1]);
                break;
            }
        }

        if (!days) return null;

        const baseline = INDIAN_BASELINES.payment[context.contractType] || INDIAN_BASELINES.payment.general;

        if (days >= baseline.critical) {
            return {
                category: 'Payment Terms',
                foundInContract: `Net ${days} days`,
                fairStandard: `Net ${baseline.standard} days`,
                deviationLevel: 'EXTREME',
                explanation: `Payment in ${days} days is ${days - baseline.standard} days beyond the Indian standard of Net ${baseline.standard}. This creates critical cash flow risk.`
            };
        } else if (days >= baseline.danger) {
            return {
                category: 'Payment Terms',
                foundInContract: `Net ${days} days`,
                fairStandard: `Net ${baseline.standard} days`,
                deviationLevel: 'SIGNIFICANT',
                explanation: `Payment terms of ${days} days exceed the industry standard of ${baseline.standard} days by ${days - baseline.standard} days.`
            };
        } else if (days >= baseline.warning) {
            return {
                category: 'Payment Terms',
                foundInContract: `Net ${days} days`,
                fairStandard: `Net ${baseline.standard} days`,
                deviationLevel: 'MINOR',
                explanation: `Payment terms are ${days - baseline.standard} days beyond standard, which is slightly slow but acceptable.`
            };
        }

        return null;
    }

    private checkNoticePeriod(text: string, context: ContractContext): Deviation | null {
        const baseline = INDIAN_BASELINES.notice_period[context.contractType] || INDIAN_BASELINES.notice_period.general;

        // Check for immediate termination
        if (text.includes('immediate termination') || text.includes('terminate immediately') ||
            text.includes('without notice') || text.includes('without prior notice')) {
            return {
                category: 'Termination Notice',
                foundInContract: 'Immediate termination without notice',
                fairStandard: `${baseline.standard} days written notice`,
                deviationLevel: 'EXTREME',
                explanation: `Allowing immediate termination without notice is unfair. Standard practice requires ${baseline.standard} days notice.`
            };
        }

        // Extract notice period
        const patterns = [
            /(\d+)\s*days?\s+(?:written\s+)?notice/i,
            /notice\s+(?:period\s+)?(?:of\s+)?(\d+)\s*days?/i,
            /terminate\s+with\s+(\d+)\s*days?/i,
        ];

        let noticeDays: number | null = null;
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                noticeDays = parseInt(match[1]);
                break;
            }
        }

        if (!noticeDays) return null;

        // For freelance/consultant, shorter notice is worse
        if (baseline.direction === 'below') {
            if (noticeDays <= baseline.critical) {
                return {
                    category: 'Termination Notice',
                    foundInContract: `${noticeDays} days notice`,
                    fairStandard: `${baseline.standard} days notice`,
                    deviationLevel: 'EXTREME',
                    explanation: `${noticeDays} days notice is too short for ${context.contractType} contracts.`
                };
            } else if (noticeDays <= baseline.danger) {
                return {
                    category: 'Termination Notice',
                    foundInContract: `${noticeDays} days notice`,
                    fairStandard: `${baseline.standard} days notice`,
                    deviationLevel: 'SIGNIFICANT',
                    explanation: `Notice period of ${noticeDays} days is shorter than the recommended ${baseline.standard} days.`
                };
            }
        }
        // For employment, longer notice for employee is worse
        else if (baseline.direction === 'above') {
            if (noticeDays >= baseline.critical) {
                return {
                    category: 'Termination Notice',
                    foundInContract: `${noticeDays} days notice required`,
                    fairStandard: `${baseline.standard} days notice`,
                    deviationLevel: 'EXTREME',
                    explanation: `${noticeDays} days notice is excessively long and locks you in unfairly.`
                };
            } else if (noticeDays >= baseline.danger) {
                return {
                    category: 'Termination Notice',
                    foundInContract: `${noticeDays} days notice required`,
                    fairStandard: `${baseline.standard} days notice`,
                    deviationLevel: 'SIGNIFICANT',
                    explanation: `Notice period of ${noticeDays} days is longer than standard ${baseline.standard} days.`
                };
            }
        }

        return null;
    }

    private checkLiabilityCap(text: string, context: ContractContext): Deviation | null {
        const baseline = INDIAN_BASELINES.liability_cap[context.contractType] || INDIAN_BASELINES.liability_cap.general;

        // Check for unlimited liability
        if (text.includes('unlimited liability') || text.includes('no limit on liability') ||
            text.includes('without limitation') || text.includes('all damages without cap')) {
            return {
                category: 'Liability Cap',
                foundInContract: 'Unlimited liability',
                fairStandard: `Capped at ${baseline.standard}x contract value`,
                deviationLevel: 'EXTREME',
                explanation: `Unlimited liability is extremely risky. Fair contracts cap liability at ${baseline.standard}x the contract value.`
            };
        }

        // Check for multipliers
        const multiplierMatch = text.match(/(\d+)x\s+(?:contract|project|fee|value)/i);
        if (multiplierMatch) {
            const multiple = parseInt(multiplierMatch[1]);
            if (multiple >= baseline.danger) {
                return {
                    category: 'Liability Cap',
                    foundInContract: `${multiple}x contract value`,
                    fairStandard: `${baseline.standard}x contract value`,
                    deviationLevel: multiple >= baseline.danger ? 'SIGNIFICANT' : 'MINOR',
                    explanation: `Liability of ${multiple}x contract value is ${multiple > baseline.standard ? 'higher' : 'within range of'} the standard ${baseline.standard}x.`
                };
            }
        }

        return null;
    }

    private checkWorkingHours(text: string, context: ContractContext): Deviation | null {
        const baseline = INDIAN_BASELINES.working_hours[context.contractType] || INDIAN_BASELINES.working_hours.general;

        // Check for 24/7 availability
        if (text.includes('24/7') || text.includes('available at all times') || text.includes('always available')) {
            return {
                category: 'Working Hours',
                foundInContract: '24/7 availability required',
                fairStandard: `${baseline.standard} hours/week`,
                deviationLevel: 'EXTREME',
                explanation: `Requiring 24/7 availability is unreasonable. Standard is ${baseline.standard} hours per week.`
            };
        }

        // Extract hours
        const hoursMatch = text.match(/(\d+)\s*hours?\s*(?:per|\/)\s*week/i);
        if (hoursMatch) {
            const hours = parseInt(hoursMatch[1]);
            if (hours >= baseline.critical) {
                return {
                    category: 'Working Hours',
                    foundInContract: `${hours} hours/week`,
                    fairStandard: `${baseline.standard} hours/week`,
                    deviationLevel: 'EXTREME',
                    explanation: `${hours} hours per week exceeds legal limits and may violate labor laws.`
                };
            } else if (hours >= baseline.danger) {
                return {
                    category: 'Working Hours',
                    foundInContract: `${hours} hours/week`,
                    fairStandard: `${baseline.standard} hours/week`,
                    deviationLevel: 'SIGNIFICANT',
                    explanation: `${hours} hours per week is above the standard ${baseline.standard} hours.`
                };
            }
        }

        return null;
    }

    private checkConfidentialityPeriod(text: string, context: ContractContext): Deviation | null {
        const baseline = INDIAN_BASELINES.confidentiality_period[context.contractType] || INDIAN_BASELINES.confidentiality_period.general;

        // Check for perpetual confidentiality
        if (text.includes('perpetual') || text.includes('forever') || text.includes('indefinite') ||
            text.includes('in perpetuity') || text.includes('without time limit')) {
            return {
                category: 'Confidentiality Period',
                foundInContract: 'Perpetual/indefinite confidentiality',
                fairStandard: `${baseline.standard} years`,
                deviationLevel: 'EXTREME',
                explanation: `Perpetual confidentiality is excessive. Standard NDA duration is ${baseline.standard}-${baseline.warning} years.`
            };
        }

        // Extract years
        const yearsMatch = text.match(/(?:confidential|nda)\s+(?:for|period\s+of)\s+(\d+)\s*years?/i) ||
            text.match(/(\d+)\s*years?\s+(?:confidentiality|nda)/i);
        if (yearsMatch) {
            const years = parseInt(yearsMatch[1]);
            if (years >= baseline.danger) {
                return {
                    category: 'Confidentiality Period',
                    foundInContract: `${years} years`,
                    fairStandard: `${baseline.standard} years`,
                    deviationLevel: years >= baseline.danger ? 'SIGNIFICANT' : 'MINOR',
                    explanation: `${years} years confidentiality is ${years - baseline.standard} years longer than standard.`
                };
            }
        }

        return null;
    }

    private checkJurisdiction(text: string): Deviation | null {
        const foreignJurisdictions = [
            { pattern: /(?:governed by|laws of|jurisdiction of)\s+(?:the\s+)?(?:state of\s+)?(?:usa|united states|america)/i, name: 'USA' },
            { pattern: /(?:governed by|laws of|jurisdiction of)\s+(?:the\s+)?(?:state of\s+)?delaware/i, name: 'Delaware, USA' },
            { pattern: /(?:governed by|laws of|jurisdiction of)\s+(?:the\s+)?(?:state of\s+)?california/i, name: 'California, USA' },
            { pattern: /(?:governed by|laws of|jurisdiction of)\s+(?:the\s+)?(?:state of\s+)?new york/i, name: 'New York, USA' },
            { pattern: /(?:governed by|laws of|jurisdiction of)\s+(?:the\s+)?(?:uk|united kingdom|england|english law)/i, name: 'United Kingdom' },
            { pattern: /(?:governed by|laws of|jurisdiction of)\s+(?:the\s+)?singapore/i, name: 'Singapore' },
            { pattern: /arbitration\s+in\s+(?:singapore|uk|usa|london|new york)/i, name: 'Foreign Arbitration' },
        ];

        for (const jurisdiction of foreignJurisdictions) {
            if (jurisdiction.pattern.test(text)) {
                return {
                    category: 'Jurisdiction',
                    foundInContract: `${jurisdiction.name} jurisdiction`,
                    fairStandard: 'Indian courts (Mumbai/Delhi/Bangalore)',
                    deviationLevel: 'SIGNIFICANT',
                    explanation: `Disputes under ${jurisdiction.name} law are expensive and impractical for Indian freelancers. Try to negotiate Indian jurisdiction.`
                };
            }
        }

        return null;
    }
}

/**
 * Legacy function for backward compatibility
 */
export function checkDeviationsFromFairContract(clauses: Clause[]): Deviation[] {
    // Combine all clause text
    const fullText = clauses.map(c => c.text).join('\n');

    // Use enhanced checker with default context
    const checker = new EnhancedDeviationChecker();
    return checker.check(fullText, {
        contractType: 'freelance',
        industry: 'general',
    });
}

// Export singleton instance
export const enhancedDeviationChecker = new EnhancedDeviationChecker();
