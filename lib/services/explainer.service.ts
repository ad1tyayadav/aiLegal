import { GoogleGenerativeAI } from '@google/generative-ai';
import { getExplanationTemplate } from '../db/queries';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

/**
 * Generate ELI5 explanation using Gemini API
 * IMPORTANT: AI only explains, it does NOT decide legality (that's rule-based)
 */
export async function explainClause(
    clauseText: string,
    clauseType: string,
    indianLawSectionText: string,
    language: 'en' | 'hi' = 'en'
): Promise<{
    simpleExplanation: string;
    realLifeImpact: string;
}> {
    // Get template for consistency
    const template = getExplanationTemplate(clauseType) as any;

    if (!template) {
        // Fallback if no template
        return generateWithoutTemplate(clauseText, indianLawSectionText, language);
    }

    const prompt = `
You are explaining a legal contract clause to an Indian freelancer with NO legal background.

CRITICAL CONTEXT:
- This is for INDIAN law, NOT US law
- Indian Contract Act, 1872 is different from US contracts law
- Example: Non-compete clauses are VOID in India (Section 27) but may be valid in USA

CLAUSE FROM CONTRACT:
"${clauseText}"

INDIAN LAW SECTION (from official 53-page PDF):
${indianLawSectionText}

TEMPLATE GUIDANCE:
Base Explanation: ${template.base_explanation_en}
Real-Life Impact: ${template.real_life_impact_en}
Hint: ${template.gemini_prompt_hint}

YOUR TASK:
1. Write a simple explanation (2-3 sentences) in ${language === 'hi' ? 'Hindi' : 'English'}
2. Describe real-life impact on Indian freelancer (2-3 sentences)

RULES:
- Use everyday language (explain like talking to a friend)
- NO legal jargon (avoid words like "void ab initio", "consideration", "contra proferentem")
- Be SPECIFIC about impact (not vague like "could cause issues")
- Cite the Indian law section number
- Do NOT use phrases from US law
- Do NOT tell them to "consult a lawyer" (we know that already)

Format response as JSON:
{
  "simpleExplanation": "...",
  "realLifeImpact": "..."
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
            simpleExplanation: template.base_explanation_en,
            realLifeImpact: template.real_life_impact_en
        };
    }
}

async function generateWithoutTemplate(
    clauseText: string,
    indianLawSection: string,
    language: 'en' | 'hi'
): Promise<{ simpleExplanation: string; realLifeImpact: string }> {
    const prompt = `
Explain this contract clause to an Indian freelancer in simple ${language === 'hi' ? 'Hindi' : 'English'}:

CLAUSE: "${clauseText}"

INDIAN LAW CONTEXT: ${indianLawSection}

Return JSON:
{
  "simpleExplanation": "2-3 sentences in plain language",
  "realLifeImpact": "Specific impact on freelancer's life/work"
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
            simpleExplanation: 'This clause may be risky. Review carefully.',
            realLifeImpact: 'Could affect your ability to work freely.'
        };
    }
}
