import { getAllFairContractBaselines } from '../db/queries';
import type { Clause, Deviation, ContractContext } from '../types/contract.types';

/**
 * Indian Contract Act 1872 - Relevant Section References
 * Used to provide legal citations for deviations
 */
export const INDIAN_CONTRACT_ACT_REFERENCES = {
    freeConsent: {
        section: 'Section 14',
        title: 'Free Consent',
        description: 'Consent is free when not caused by coercion, undue influence, fraud, or misrepresentation.',
    },
    lawfulObject: {
        section: 'Section 23',
        title: 'Lawful Consideration and Object',
        description: 'Consideration or object is unlawful if forbidden by law, fraudulent, or opposed to public policy.',
    },
    restraintOfTrade: {
        section: 'Section 27',
        title: 'Agreement in Restraint of Trade',
        description: 'Every agreement restraining anyone from exercising lawful profession, trade or business is to that extent void.',
    },
    restraintOfLegalProceedings: {
        section: 'Section 28',
        title: 'Agreements in Restraint of Legal Proceedings',
        description: 'Agreements restricting enforcement of rights or extinguishing rights on expiry of specified period are void.',
    },
    timeEssential: {
        section: 'Section 55',
        title: 'Time-Essential Performance',
        description: 'When time is essential, failure to perform at specified time makes contract voidable.',
    },
    breachCompensation: {
        section: 'Section 73',
        title: 'Compensation for Breach',
        description: 'Compensation for loss or damage caused by breach, arising naturally from such breach.',
    },
    penalty: {
        section: 'Section 74',
        title: 'Penalty Stipulation',
        description: 'Party is entitled to reasonable compensation not exceeding penalty amount, whether or not actual damage proved.',
    },
};

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
 * Helper: Check if text contains a phrase in context (within N characters of another phrase)
 * This reduces false positives by requiring multiple signals
 */
function hasPhrasesInContext(text: string, phrase1: string, phrase2: string, contextWindow: number = 100): boolean {
    const lowerText = text.toLowerCase();
    const idx1 = lowerText.indexOf(phrase1.toLowerCase());
    if (idx1 === -1) return false;

    const idx2 = lowerText.indexOf(phrase2.toLowerCase());
    if (idx2 === -1) return false;

    // Check if they're within the context window of each other
    return Math.abs(idx1 - idx2) <= contextWindow;
}

/**
 * Helper: Check if text contains any of the given patterns
 */
function containsAny(text: string, patterns: string[]): boolean {
    const lowerText = text.toLowerCase();
    return patterns.some(p => lowerText.includes(p.toLowerCase()));
}

/**
 * Helper: Extract actual text from contract around a matched phrase
 * Returns the sentence/clause containing the matched phrase
 */
function extractMatchedText(originalText: string, searchPhrase: string, contextChars: number = 150): string | undefined {
    const lowerText = originalText.toLowerCase();
    const lowerPhrase = searchPhrase.toLowerCase();
    const idx = lowerText.indexOf(lowerPhrase);

    if (idx === -1) return undefined;

    // Find sentence boundaries (. ! ? or newline)
    let start = idx;
    let end = idx + searchPhrase.length;

    // Extend back to sentence start (max contextChars)
    for (let i = idx - 1; i >= Math.max(0, idx - contextChars); i--) {
        if (originalText[i] === '.' || originalText[i] === '\n' || originalText[i] === '!' || originalText[i] === '?') {
            start = i + 1;
            break;
        }
        start = i;
    }

    // Extend forward to sentence end (max contextChars)
    for (let i = end; i < Math.min(originalText.length, idx + contextChars); i++) {
        if (originalText[i] === '.' || originalText[i] === '\n' || originalText[i] === '!' || originalText[i] === '?') {
            end = i + 1;
            break;
        }
        end = i + 1;
    }

    return originalText.substring(start, end).trim();
}

/**
 * Enhanced Deviation Checker
 * Compares contract clauses against Indian fair contract baselines
 * Now with improved false positive reduction and legal citations
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

        // Check notice period (with improved false positive reduction)
        const noticeDeviation = this.checkNoticePeriod(text, contractText, context);
        if (noticeDeviation) deviations.push(noticeDeviation);

        // Check liability cap
        const liabilityDeviation = this.checkLiabilityCap(text, context);
        if (liabilityDeviation) deviations.push(liabilityDeviation);

        // Check working hours
        const hoursDeviation = this.checkWorkingHours(text, context);
        if (hoursDeviation) deviations.push(hoursDeviation);

        // Check confidentiality period (with improved false positive reduction)
        const ndaDeviation = this.checkConfidentialityPeriod(text, contractText, context);
        if (ndaDeviation) deviations.push(ndaDeviation);

        // Check foreign jurisdiction
        const jurisdictionDeviation = this.checkJurisdiction(text);
        if (jurisdictionDeviation) deviations.push(jurisdictionDeviation);

        // Check restraint of trade (new - based on Section 27)
        const restraintDeviation = this.checkRestraintOfTrade(text);
        if (restraintDeviation) deviations.push(restraintDeviation);

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
        const ref = INDIAN_CONTRACT_ACT_REFERENCES.breachCompensation;

        if (days >= baseline.critical) {
            return {
                category: 'Payment Terms',
                foundInContract: `Net ${days} days`,
                fairStandard: `Net ${baseline.standard} days`,
                deviationLevel: 'EXTREME',
                explanation: `Payment in ${days} days is ${days - baseline.standard} days beyond the Indian standard of Net ${baseline.standard}. This creates critical cash flow risk.`,
                legalReference: `${ref.section}: ${ref.title}`,
            };
        } else if (days >= baseline.danger) {
            return {
                category: 'Payment Terms',
                foundInContract: `Net ${days} days`,
                fairStandard: `Net ${baseline.standard} days`,
                deviationLevel: 'SIGNIFICANT',
                explanation: `Payment terms of ${days} days exceed the industry standard of ${baseline.standard} days by ${days - baseline.standard} days.`,
                legalReference: `${ref.section}: ${ref.title}`,
            };
        } else if (days >= baseline.warning) {
            return {
                category: 'Payment Terms',
                foundInContract: `Net ${days} days`,
                fairStandard: `Net ${baseline.standard} days`,
                deviationLevel: 'MINOR',
                explanation: `Payment terms are ${days - baseline.standard} days beyond standard, which is slightly slow but acceptable.`,
                legalReference: `${ref.section}: ${ref.title}`,
            };
        }

        return null;
    }

    private checkNoticePeriod(text: string, originalText: string, context: ContractContext): Deviation | null {
        const baseline = INDIAN_BASELINES.notice_period[context.contractType] || INDIAN_BASELINES.notice_period.general;
        const ref = INDIAN_CONTRACT_ACT_REFERENCES.timeEssential;

        // IMPROVED: Check for immediate termination with STRONGER signals
        // Require multiple indicators to reduce false positives
        const immediateTerminationSignals = [
            // Strong signal: "immediate termination" as a phrase
            text.includes('immediate termination'),
            // Strong signal: "terminate immediately" as a phrase
            text.includes('terminate immediately'),
            // Context-aware: "without notice" near "termination" or "terminate"
            hasPhrasesInContext(text, 'without notice', 'terminat', 150),
            // Context-aware: "without prior notice" near termination context
            hasPhrasesInContext(text, 'without prior notice', 'terminat', 150),
        ];

        // Require at least ONE strong signal (the phrase itself) not just partial matches
        const hasImmediateTermination = immediateTerminationSignals[0] || immediateTerminationSignals[1] ||
            (immediateTerminationSignals[2] && containsAny(text, ['termination clause', 'right to terminate', 'may terminate'])) ||
            (immediateTerminationSignals[3] && containsAny(text, ['termination clause', 'right to terminate', 'may terminate']));

        // Also check for explicit notice period - if contract has explicit notice period, don't flag immediate termination
        const hasExplicitNoticePeriod = /(\d+)\s*days?\s+(?:written\s+)?notice/i.test(text) ||
            /notice\s+(?:period\s+)?(?:of\s+)?(\d+)\s*days?/i.test(text);

        if (hasImmediateTermination && !hasExplicitNoticePeriod) {
            // Determine which phrase matched and extract actual text
            let matchedPhrase = 'immediate termination';
            if (immediateTerminationSignals[0]) {
                matchedPhrase = 'immediate termination';
            } else if (immediateTerminationSignals[1]) {
                matchedPhrase = 'terminate immediately';
            } else if (immediateTerminationSignals[2] || immediateTerminationSignals[3]) {
                matchedPhrase = 'without notice';
            }

            const actualText = extractMatchedText(originalText, matchedPhrase, 200);

            return {
                category: 'Termination Notice',
                foundInContract: 'Immediate termination without notice',
                fairStandard: `${baseline.standard} days written notice`,
                deviationLevel: 'EXTREME',
                explanation: `Allowing immediate termination without notice is unfair. Standard practice requires ${baseline.standard} days notice.`,
                legalReference: `${ref.section}: ${ref.title}`,
                matchedText: actualText,
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
                    explanation: `${noticeDays} days notice is too short for ${context.contractType} contracts.`,
                    legalReference: `${ref.section}: ${ref.title}`,
                };
            } else if (noticeDays <= baseline.danger) {
                return {
                    category: 'Termination Notice',
                    foundInContract: `${noticeDays} days notice`,
                    fairStandard: `${baseline.standard} days notice`,
                    deviationLevel: 'SIGNIFICANT',
                    explanation: `Notice period of ${noticeDays} days is shorter than the recommended ${baseline.standard} days.`,
                    legalReference: `${ref.section}: ${ref.title}`,
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
                    explanation: `${noticeDays} days notice is excessively long and locks you in unfairly.`,
                    legalReference: `${ref.section}: ${ref.title}`,
                };
            } else if (noticeDays >= baseline.danger) {
                return {
                    category: 'Termination Notice',
                    foundInContract: `${noticeDays} days notice required`,
                    fairStandard: `${baseline.standard} days notice`,
                    deviationLevel: 'SIGNIFICANT',
                    explanation: `Notice period of ${noticeDays} days is longer than standard ${baseline.standard} days.`,
                    legalReference: `${ref.section}: ${ref.title}`,
                };
            }
        }

        return null;
    }

    private checkLiabilityCap(text: string, context: ContractContext): Deviation | null {
        const baseline = INDIAN_BASELINES.liability_cap[context.contractType] || INDIAN_BASELINES.liability_cap.general;
        const ref = INDIAN_CONTRACT_ACT_REFERENCES.penalty;

        // IMPROVED: Require stronger signals for unlimited liability
        // Check for explicit unlimited liability statements
        const unlimitedLiabilityPatterns = [
            /unlimited\s+liability/i,
            /no\s+limit\s+on\s+liability/i,
            /full\s+liability\s+without\s+cap/i,
            /liable\s+for\s+all\s+damages?\s+without\s+(?:any\s+)?(?:cap|limit)/i,
        ];

        const hasUnlimitedLiability = unlimitedLiabilityPatterns.some(p => p.test(text));

        if (hasUnlimitedLiability) {
            return {
                category: 'Liability Cap',
                foundInContract: 'Unlimited liability',
                fairStandard: `Capped at ${baseline.standard}x contract value`,
                deviationLevel: 'EXTREME',
                explanation: `Unlimited liability is extremely risky. Fair contracts cap liability at ${baseline.standard}x the contract value.`,
                legalReference: `${ref.section}: ${ref.title}`,
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
                    explanation: `Liability of ${multiple}x contract value is ${multiple > baseline.standard ? 'higher' : 'within range of'} the standard ${baseline.standard}x.`,
                    legalReference: `${ref.section}: ${ref.title}`,
                };
            }
        }

        return null;
    }

    private checkWorkingHours(text: string, context: ContractContext): Deviation | null {
        const baseline = INDIAN_BASELINES.working_hours[context.contractType] || INDIAN_BASELINES.working_hours.general;

        // Check for 24/7 availability - require context
        const has247 = text.includes('24/7') || text.includes('24x7');
        const hasAvailabilityContext = containsAny(text, ['available', 'availability', 'on call', 'on-call']);

        if (has247 && hasAvailabilityContext) {
            return {
                category: 'Working Hours',
                foundInContract: '24/7 availability required',
                fairStandard: `${baseline.standard} hours/week`,
                deviationLevel: 'EXTREME',
                explanation: `Requiring 24/7 availability is unreasonable. Standard is ${baseline.standard} hours per week.`,
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
                    explanation: `${hours} hours per week exceeds legal limits and may violate labor laws.`,
                };
            } else if (hours >= baseline.danger) {
                return {
                    category: 'Working Hours',
                    foundInContract: `${hours} hours/week`,
                    fairStandard: `${baseline.standard} hours/week`,
                    deviationLevel: 'SIGNIFICANT',
                    explanation: `${hours} hours per week is above the standard ${baseline.standard} hours.`,
                };
            }
        }

        return null;
    }

    private checkConfidentialityPeriod(text: string, originalText: string, context: ContractContext): Deviation | null {
        const baseline = INDIAN_BASELINES.confidentiality_period[context.contractType] || INDIAN_BASELINES.confidentiality_period.general;
        const ref = INDIAN_CONTRACT_ACT_REFERENCES.lawfulObject;

        // IMPROVED: Check for perpetual confidentiality with CONTEXT
        // Require both the perpetual keyword AND confidentiality context within 200 chars
        const perpetualKeywords = ['perpetual', 'forever', 'indefinite', 'in perpetuity', 'without time limit', 'no expiration'];
        const confidentialityKeywords = ['confidential', 'nda', 'non-disclosure', 'proprietary information', 'trade secret'];

        let hasPerpetualConfidentiality = false;

        for (const perpetual of perpetualKeywords) {
            if (text.includes(perpetual)) {
                // Check if confidentiality context exists nearby
                for (const conf of confidentialityKeywords) {
                    if (hasPhrasesInContext(text, perpetual, conf, 200)) {
                        hasPerpetualConfidentiality = true;
                        break;
                    }
                }
            }
            if (hasPerpetualConfidentiality) break;
        }

        // Also check if contract has explicit years mentioned for confidentiality - if so, don't flag perpetual
        const hasExplicitPeriod = /confidential(?:ity)?\s+(?:for|period\s+of)\s+(\d+)\s*years?/i.test(text) ||
            /(\d+)\s*years?\s+(?:confidentiality|nda)/i.test(text);

        if (hasPerpetualConfidentiality && !hasExplicitPeriod) {
            return {
                category: 'Confidentiality Period',
                foundInContract: 'Perpetual/indefinite confidentiality',
                fairStandard: `${baseline.standard} years`,
                deviationLevel: 'EXTREME',
                explanation: `Perpetual confidentiality is excessive. Standard NDA duration is ${baseline.standard}-${baseline.warning} years.`,
                legalReference: `${ref.section}: ${ref.title}`,
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
                    explanation: `${years} years confidentiality is ${years - baseline.standard} years longer than standard.`,
                    legalReference: `${ref.section}: ${ref.title}`,
                };
            }
        }

        return null;
    }

    private checkJurisdiction(text: string): Deviation | null {
        const ref = INDIAN_CONTRACT_ACT_REFERENCES.restraintOfLegalProceedings;

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
                    explanation: `Disputes under ${jurisdiction.name} law are expensive and impractical for Indian freelancers. Try to negotiate Indian jurisdiction.`,
                    legalReference: `${ref.section}: ${ref.title}`,
                };
            }
        }

        return null;
    }

    /**
     * NEW: Check for restraint of trade clauses (Section 27)
     */
    private checkRestraintOfTrade(text: string): Deviation | null {
        const ref = INDIAN_CONTRACT_ACT_REFERENCES.restraintOfTrade;

        // Look for non-compete clauses with excessive restrictions
        const nonCompetePatterns = [
            /non-?compete\s+(?:clause|agreement|period)\s+(?:of\s+)?(\d+)\s*years?/i,
            /not\s+(?:work|engage|provide\s+services)\s+(?:for|with)\s+(?:any\s+)?(?:competitor|competing)/i,
            /restrain(?:ed)?\s+from\s+(?:working|engaging|providing)/i,
        ];

        // Check for excessive non-compete
        const yearsMatch = text.match(/non-?compete\s+(?:clause|agreement|period)?\s*(?:of\s+)?(\d+)\s*years?/i);
        if (yearsMatch) {
            const years = parseInt(yearsMatch[1]);
            if (years > 2) {
                return {
                    category: 'Non-Compete Clause',
                    foundInContract: `${years} year non-compete`,
                    fairStandard: '1-2 years (or void under Section 27)',
                    deviationLevel: years > 5 ? 'EXTREME' : 'SIGNIFICANT',
                    explanation: `A ${years}-year non-compete may be void under Indian Contract Act Section 27. Non-compete agreements are generally unenforceable in India except for business sale goodwill protection.`,
                    legalReference: `${ref.section}: ${ref.title}`,
                };
            }
        }

        // Check for blanket non-compete (no time/geographic limit)
        if (containsAny(text, ['shall not work for any competitor', 'prohibited from working with competitors', 'not engage in any competing business'])) {
            // Check if there's a reasonable time limit mentioned nearby
            const hasTimeLimit = /for\s+(?:a\s+)?(?:period\s+of\s+)?(\d+)\s*(?:months?|years?)/i.test(text);
            if (!hasTimeLimit) {
                return {
                    category: 'Non-Compete Clause',
                    foundInContract: 'Blanket non-compete without time limit',
                    fairStandard: 'Generally void under Section 27',
                    deviationLevel: 'EXTREME',
                    explanation: `Blanket non-compete clauses without reasonable limits are void under Indian Contract Act Section 27. Agreements restraining anyone from exercising lawful trade are unenforceable.`,
                    legalReference: `${ref.section}: ${ref.title}`,
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
