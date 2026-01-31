import { GoogleGenerativeAI } from '@google/generative-ai';
import { getExplanationTemplate } from '../db/queries';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

/**
 * Generate role-based explanations using Gemini API
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
        // Fallback if no template
        return generateWithoutTemplate(clauseText, indianLawSectionText, language);
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

Return JSON:
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

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Extract JSON (handle markdown code blocks)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Invalid Gemini response format');
        }

        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error('Gemini API error:', error);
        // Fallback to template if AI fails
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
}


async function generateWithoutTemplate(
    clauseText: string,
    indianLawSection: string,
    language: 'en' | 'hi'
): Promise<{
    freelancer: { simpleExplanation: string; realLifeImpact: string; };
    company: { simpleExplanation: string; realLifeImpact: string; };
}> {
    const prompt = `
Explain this contract clause from TWO perspectives in ${language === 'hi' ? 'Hindi' : 'English'}:

CLAUSE: "${clauseText}"
INDIAN LAW CONTEXT: ${indianLawSection}

Return JSON with explanations for both FREELANCER and COMPANY:
{
  "freelancer": {
    "simpleExplanation": "2-3 sentences from worker's perspective",
    "realLifeImpact": "Impact on their income/career"
  },
  "company": {
    "simpleExplanation": "2-3 sentences from employer's perspective",
    "realLifeImpact": "Impact on business/legal risk"
  }
}
`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            throw new Error('Invalid response');
        }

        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        return {
            freelancer: {
                simpleExplanation: 'This clause may be risky. Review carefully.',
                realLifeImpact: 'Could affect your ability to work freely.'
            },
            company: {
                simpleExplanation: 'This clause may have enforceability issues.',
                realLifeImpact: 'Consider legal review before relying on this provision.'
            }
        };
    }
}
