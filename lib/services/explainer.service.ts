import { chatCompletion } from './huggingface.service';
import { getExplanationTemplate } from '../db/queries';

/**
 * Generate role-based explanations using HuggingFace AI with fallback
 * Returns BOTH freelancer and company perspectives in one call
 */
export async function explainClause(
    clauseText: string,
    clauseType: string,
    indianLawSectionText: string,
    language: 'en' | 'hi' = 'en'
): Promise<{
    freelancer: { simpleExplanation: string; realLifeImpact: string; };
    company: { simpleExplanation: string; realLifeImpact: string; };
}> {
    // Get template for consistency
    const template = getExplanationTemplate(clauseType) as any;

    if (!template) {
        return generateWithRetry(clauseText, indianLawSectionText, language);
    }

    const prompt = `
You are explaining a legal contract clause from TWO different perspectives.

CRITICAL CONTEXT:
- This is for INDIAN law, NOT US law
- Indian Contract Act, 1872 applies
- Example: Non-compete clauses are VOID in India (Section 27)

CLAUSE FROM CONTRACT:
"${clauseText}"

INDIAN LAW SECTION:
${indianLawSectionText}

TEMPLATE GUIDANCE:
Base Explanation: ${template.base_explanation_en}
Real-Life Impact: ${template.real_life_impact_en}
Hint: ${template.gemini_prompt_hint}

YOUR TASK:
Generate explanations for TWO audiences in ${language === 'hi' ? 'Hindi' : 'English'}:

1. FREELANCER/EMPLOYEE perspective:
   - Focus on: personal risk, income protection, career freedom
   - Tone: protective, empathetic, actionable
   - Example: "This could stop you from taking future clients..."

2. COMPANY/EMPLOYER perspective:
   - Focus on: enforceability risk, legal liability, business implications
   - Tone: professional, pragmatic, strategic
   - Example: "This clause may be unenforceable under Indian law..."

RULES:
- Use everyday language (NO legal jargon)
- Be SPECIFIC about impacts
- Cite the Indian law section number
- Keep each explanation to 2-3 sentences

Return JSON ONLY (no markdown, no code blocks):
{
  "freelancer": {
    "simpleExplanation": "...",
    "realLifeImpact": "..."
  },
  "company": {
    "simpleExplanation": "...",
    "realLifeImpact": "..."
  }
}
`;

    return executeExplanation(prompt, template, clauseText);
}

async function generateWithRetry(
    clauseText: string,
    indianLawSection: string,
    language: 'en' | 'hi'
) {
    const prompt = `
You are a legal expert explaining contract clauses.

CONTEXT: Indian Contract Act, 1872 applies.

CLAUSE: "${clauseText.substring(0, 400)}"
INDIAN LAW: ${indianLawSection.substring(0, 300)}

Return ONLY valid JSON (no markdown, no code blocks):
{
  "freelancer": {
    "simpleExplanation": "2-3 sentences from worker's perspective about risks",
    "realLifeImpact": "Specific impact on their income/career"
  },
  "company": {
    "simpleExplanation": "2-3 sentences from employer's perspective about enforceability", 
    "realLifeImpact": "Specific business/legal risk"
  }
}
`;

    return executeExplanation(prompt, null, clauseText);
}

/**
 * Execute generation with HuggingFace and fallback handling
 */
async function executeExplanation(prompt: string, template: any, clauseText: string) {
    try {
        console.log(`[EXPLAINER] 🤖 Generating explanation with HuggingFace...`);

        const text = await chatCompletion(prompt, {
            temperature: 0.7,
            maxTokens: 1024,
        });

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error(`Invalid JSON response from HuggingFace`);
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // Validate structure
        if (!parsed.freelancer || !parsed.company) {
            throw new Error('Incomplete JSON structure');
        }

        console.log(`[EXPLAINER] ✅ Successfully generated explanation`);
        return parsed;

    } catch (error: any) {
        console.error(`[EXPLAINER] ❌ HuggingFace failed:`, error.message);
        console.log(`[EXPLAINER] 📦 Using static fallback`);
        return getStaticFallback(clauseText, template);
    }
}

/**
 * Enhanced static fallback when all AI fails
 */
function getStaticFallback(clauseText: string, template: any) {
    // 1. Use template if available
    if (template) {
        return {
            freelancer: {
                simpleExplanation: template.base_explanation_en,
                realLifeImpact: template.real_life_impact_en
            },
            company: {
                simpleExplanation: 'This clause may expose the company to legal challenges.',
                realLifeImpact: 'Consider reviewing with legal counsel before enforcement.'
            }
        };
    }

    const clauseLower = clauseText.toLowerCase();

    // 2. Keyword-based Smart Fallback (Pre-written "AI-like" responses)
    if (clauseLower.includes('compete') || clauseLower.includes('competitor')) {
        return {
            freelancer: {
                simpleExplanation: 'Non-compete clauses are generally void in India under Section 27 of the Contract Act.',
                realLifeImpact: 'You likely cannot be legally forced to stop working for competitors after leaving.'
            },
            company: {
                simpleExplanation: 'Restraint of trade clauses are void under Section 27 unless for sale of goodwill.',
                realLifeImpact: 'Enforcing this against a former employee is legally difficult in India.'
            }
        };
    }

    if (clauseLower.includes('indemn') || clauseLower.includes('liability') || clauseLower.includes('liable')) {
        return {
            freelancer: {
                simpleExplanation: 'Unlimited liability means you could be personally responsible for massive damages.',
                realLifeImpact: 'This could put your personal assets at risk. Always ask for a liability cap.'
            },
            company: {
                simpleExplanation: 'Demanding unlimited indemnity may be considered unconscionable.',
                realLifeImpact: 'Courts may limit liability to reasonable foreseeability under Section 73.'
            }
        };
    }

    if (clauseLower.includes('terminate') || clauseLower.includes('notice')) {
        return {
            freelancer: {
                simpleExplanation: 'Immediate termination without cause creates job insecurity.',
                realLifeImpact: 'Ensure you have a reasonable notice period (e.g., 30 days) to find new work.'
            },
            company: {
                simpleExplanation: 'Termination clauses must be fair and reciprocal to avoid disputes.',
                realLifeImpact: 'Arbitrary termination can lead to wrongful termination claims.'
            }
        };
    }

    if (clauseLower.includes('penalty') || clauseLower.includes('damages')) {
        return {
            freelancer: {
                simpleExplanation: 'Fixed penalties clearly exceeding actual loss may be void under Section 74.',
                realLifeImpact: 'You should only be liable for actual proven losses, not arbitrary penalty amounts.'
            },
            company: {
                simpleExplanation: 'Penalty clauses are only enforceable as reasonable compensation (Section 74).',
                realLifeImpact: 'Exorbitant penalty amounts are likely to be struck down by courts.'
            }
        };
    }

    // 3. Generic Fallback (Last resort)
    return {
        freelancer: {
            simpleExplanation: 'This clause contains legal obligations that affect your rights.',
            realLifeImpact: 'Review this carefully. If it feels unfair, request a modification.'
        },
        company: {
            simpleExplanation: 'This provision should be drafted carefully to ensure enforceability.',
            realLifeImpact: 'Ambiguous or unfair terms may be ruled against the drafter (contra proferentem).'
        }
    };
}
