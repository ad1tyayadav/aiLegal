/**
 * Contract Generator Service
 * 
 * Uses Gemini AI to generate contract drafts based on user prompts.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { getTemplateById, getClauses } from './contractManager.service';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

export interface GeneratedContract {
    title: string;
    content: string;
    suggestedClauses: string[];  // IDs of clauses that might be relevant
}

/**
 * Generate a contract draft based on a user prompt
 */
export async function generateContractDraft(
    prompt: string,
    templateId?: string
): Promise<GeneratedContract> {
    console.log('[CONTRACT_GEN] 🚀 Generating contract for prompt:', prompt.substring(0, 50) + '...');

    // Get template if provided
    let templateContent = '';
    if (templateId) {
        const template = getTemplateById(templateId);
        if (template) {
            templateContent = `\nUSE THIS TEMPLATE AS A STARTING POINT:\n${template.defaultContent}`;
            console.log(`[CONTRACT_GEN] 📋 Using template: ${template.title}`);
        }
    }

    // Get available clauses for suggestions
    const availableClauses = getClauses();
    const clauseCategories = [...new Set(availableClauses.map(c => c.category))];

    const systemPrompt = `You are a legal contract drafting assistant specializing in Indian law.

CONTEXT:
- You are helping an Indian freelancer/entrepreneur draft contracts
- All contracts must comply with Indian Contract Act, 1872
- Avoid clauses that are void under Indian law (e.g., broad non-compete per Section 27)

USER REQUEST:
"${prompt}"
${templateContent}

AVAILABLE CLAUSE CATEGORIES (for suggestions):
${clauseCategories.join(', ')}

YOUR TASK:
1. Generate a professional contract in MARKDOWN format
2. Include appropriate sections based on the request
3. Use placeholders for details that need to be filled in (format: {{PLACEHOLDER_NAME}})
4. Suggest which clause categories from the library would be relevant

RULES:
- Use clear, professional language
- Include standard sections: Parties, Scope, Payment, IP, Confidentiality, Termination, Governing Law, Signatures
- Adapt sections based on the specific request (e.g., NDA focuses on confidentiality)
- Keep clauses fair and balanced
- Ensure compliance with Indian law
- Use ₹ for currency

FORMAT YOUR RESPONSE AS JSON:
{
  "title": "Contract Title",
  "content": "# CONTRACT TITLE\\n\\n**Date:** {{DATE}}\\n\\n... full markdown content ...",
  "suggestedCategories": ["Confidentiality", "Payment", "Termination"]
}`;

    try {
        const result = await model.generateContent(systemPrompt);
        const text = result.response.text();

        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Invalid Gemini response format');
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // Map suggested categories to actual clause IDs
        const suggestedClauses = availableClauses
            .filter(c => parsed.suggestedCategories?.includes(c.category))
            .map(c => c.id.toString());

        console.log('[CONTRACT_GEN] ✅ Generated contract:', parsed.title);
        console.log('[CONTRACT_GEN] 📝 Suggested clauses:', suggestedClauses.length);

        return {
            title: parsed.title || 'Untitled Contract',
            content: parsed.content || '',
            suggestedClauses
        };

    } catch (error) {
        console.error('[CONTRACT_GEN] ❌ Error:', error);

        // Return a basic template as fallback
        return {
            title: 'Draft Contract',
            content: generateFallbackContract(prompt),
            suggestedClauses: []
        };
    }
}

/**
 * Fallback contract if AI fails
 */
function generateFallbackContract(prompt: string): string {
    return `# DRAFT CONTRACT

**Date:** {{DATE}}

---

## PARTIES

**Party A:** {{PARTY_A_NAME}}
**Address:** {{PARTY_A_ADDRESS}}

**Party B:** {{PARTY_B_NAME}}
**Address:** {{PARTY_B_ADDRESS}}

---

## 1. PURPOSE

${prompt}

---

## 2. SCOPE OF WORK

{{SCOPE_DESCRIPTION}}

---

## 3. COMPENSATION

**Total Fee:** ₹{{TOTAL_FEE}}

---

## 4. TIMELINE

**Start Date:** {{START_DATE}}
**End Date:** {{END_DATE}}

---

## 5. GOVERNING LAW

This Agreement shall be governed by the laws of India.

---

## SIGNATURES

**Party A:**
_________________________
Name: {{PARTY_A_NAME}}
Date: {{SIGNATURE_DATE}}

**Party B:**
_________________________
Name: {{PARTY_B_NAME}}
Date: {{SIGNATURE_DATE}}
`;
}

/**
 * Enhance an existing contract with additional clauses
 */
export async function enhanceContract(
    existingContent: string,
    clauseText: string
): Promise<string> {
    const prompt = `You are a legal contract editor.

EXISTING CONTRACT:
${existingContent}

CLAUSE TO ADD:
${clauseText}

TASK:
Insert the clause in the appropriate section of the contract. If no suitable section exists, create one.
Return the COMPLETE updated contract in markdown format.

RULES:
- Maintain the existing structure
- Place the clause logically (e.g., NDA clause goes in Confidentiality section)
- Format consistently with the rest of the document
- Only return the contract text, no explanation`;

    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error('[CONTRACT_GEN] ❌ Error enhancing contract:', error);
        // Simple fallback: append the clause
        return `${existingContent}\n\n---\n\n## Additional Terms\n\n${clauseText}`;
    }
}
