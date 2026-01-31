/**
 * AI-powered Deviation Summary Service
 * Generates plain-language explanations for contract deviations
 * using HuggingFace InferenceClient
 */

import { chatCompletion } from './huggingface.service';
import type { Deviation } from '../types/contract.types';

/**
 * Generate an AI summary for a single deviation
 */
export async function generateDeviationSummary(
    deviation: Deviation,
    contractExcerpt?: string
): Promise<string> {
    const prompt = `You are a legal expert specializing in Indian Contract Law. Explain this contract issue in simple terms:

**Issue Category:** ${deviation.category}
**Found in Contract:** ${deviation.foundInContract}
**Fair Standard:** ${deviation.fairStandard}
**Severity:** ${deviation.deviationLevel}
${deviation.legalReference ? `**Legal Reference:** ${deviation.legalReference}` : ''}
${contractExcerpt ? `**Contract Excerpt:** "${contractExcerpt.substring(0, 300)}..."` : ''}

Provide a brief (2-3 sentences) plain-language explanation of:
1. What this means for the person signing
2. What they should do about it

Be concise and practical. Do not use legal jargon.`;

    try {
        const response = await chatCompletion(prompt, {
            maxTokens: 200,
            temperature: 0.3,
        });

        // Clean up the response - remove any thinking markers
        let summary = response
            .replace(/<think>[\s\S]*?<\/think>/gi, '')
            .trim();

        // If response is too long, truncate intelligently
        if (summary.length > 400) {
            const sentences = summary.split(/[.!?]+/);
            summary = sentences.slice(0, 3).join('. ').trim();
            if (!summary.endsWith('.')) summary += '.';
        }

        return summary || deviation.explanation;
    } catch (error) {
        console.error('[DeviationSummary] AI summary failed:', error);
        // Fallback to the template explanation
        return deviation.explanation;
    }
}

/**
 * Generate AI summaries for multiple deviations
 * Processes in parallel for efficiency
 */
export async function generateDeviationSummaries(
    deviations: Deviation[],
    contractText?: string
): Promise<Deviation[]> {
    if (deviations.length === 0) return deviations;

    console.log(`[DeviationSummary] Generating AI summaries for ${deviations.length} deviations...`);

    const enhancedDeviations = await Promise.all(
        deviations.map(async (deviation) => {
            // Find relevant excerpt from contract
            const excerpt = contractText
                ? findRelevantExcerpt(contractText, deviation.category)
                : undefined;

            const aiSummary = await generateDeviationSummary(deviation, excerpt);

            return {
                ...deviation,
                aiSummary,
            };
        })
    );

    console.log('[DeviationSummary] AI summaries generated successfully');
    return enhancedDeviations;
}

/**
 * Find a relevant excerpt from the contract text for a given category
 */
function findRelevantExcerpt(text: string, category: string): string | undefined {
    const keywords: Record<string, string[]> = {
        'Payment Terms': ['payment', 'net ', 'invoice', 'payable', 'remittance'],
        'Termination Notice': ['termination', 'terminate', 'notice period', 'cancel'],
        'Liability Cap': ['liability', 'damages', 'indemnify', 'responsible'],
        'Working Hours': ['hours', 'work week', 'availability', 'working'],
        'Confidentiality Period': ['confidential', 'nda', 'non-disclosure', 'secret'],
        'Jurisdiction': ['jurisdiction', 'governing law', 'courts', 'arbitration'],
    };

    const categoryKeywords = keywords[category] || [];
    const lowerText = text.toLowerCase();

    for (const keyword of categoryKeywords) {
        const index = lowerText.indexOf(keyword);
        if (index !== -1) {
            // Extract context around the keyword (100 chars before and after)
            const start = Math.max(0, index - 100);
            const end = Math.min(text.length, index + keyword.length + 200);
            return text.substring(start, end);
        }
    }

    return undefined;
}
