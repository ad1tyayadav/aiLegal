/**
 * Contract Generator Service
 * 
 * Uses HuggingFace AI to generate contract drafts based on user prompts.
 */

import { chatCompletion } from './huggingface.service';
import { getTemplateById, getClauses, getTemplates } from './contractManager.service';

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
): Promise<GeneratedContract & { isFallback?: boolean, error?: string }> {
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

FORMAT YOUR RESPONSE AS JSON (no markdown code blocks):
{
  "title": "Contract Title",
  "content": "# CONTRACT TITLE\\n\\n**Date:** {{DATE}}\\n\\n... full markdown content ...",
  "suggestedCategories": ["Confidentiality", "Payment", "Termination"]
}`;

    // Retry Loop with backoff
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            console.log(`[CONTRACT_GEN] 🤖 Attempt ${attempt}/3 with HuggingFace...`);

            const text = await chatCompletion(systemPrompt, {
                temperature: 0.7,
                maxTokens: 4096,
            });

            // Extract JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Invalid HuggingFace response format');
            }

            const parsed = JSON.parse(jsonMatch[0]);

            // Map suggested categories to actual clause IDs
            const suggestedClauses = availableClauses
                .filter(c => parsed.suggestedCategories?.includes(c.category))
                .map(c => c.id.toString());

            console.log(`[CONTRACT_GEN] ✅ Generated contract successfully`);

            return {
                title: parsed.title || 'Untitled Contract',
                content: parsed.content || '',
                suggestedClauses,
                isFallback: false
            };

        } catch (error: any) {
            console.warn(`[CONTRACT_GEN] ⚠️ Attempt ${attempt} failed:`, error.message);
            lastError = error;

            // If rate limit (429), wait before retry
            if (error.message.includes('429')) {
                const waitTime = attempt * 2000; // 2s, 4s, 6s
                console.log(`[CONTRACT_GEN] ⏳ Rate limited. Waiting ${waitTime}ms...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            } else {
                // Wait a bit even for non-rate limit errors
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    console.error('[CONTRACT_GEN] ❌ All attempts failed:', lastError);

    const fallback = generateFallbackContract(prompt);

    // Return a basic template as fallback
    return {
        title: fallback.title,
        content: fallback.content,
        suggestedClauses: [],
        isFallback: true,
        error: lastError?.message || 'Unknown error'
    };
}

/**
 * Fallback contract if AI fails
 * Tries to match the prompt to an existing template first.
 */
function generateFallbackContract(prompt: string): { title: string, content: string } {
    const lowerPrompt = prompt.toLowerCase();

    try {
        const templates = getTemplates();

        // 1. Try to find a matching template by category or title keywords
        console.log(`[CONTRACT_GEN] 🔍 Searching fallback for keywords in: "${lowerPrompt}"`);

        const match = templates.find(t => {
            const cat = t.category.toLowerCase();
            const titleWords = t.title.toLowerCase().split(' ');

            // Direct category match
            if (lowerPrompt.includes(cat)) return true;

            // Specific keyword mapping
            if (cat === 'employment' && (lowerPrompt.includes('intern') || lowerPrompt.includes('hiring') || lowerPrompt.includes('job'))) return true;
            if (cat === 'nda' && (lowerPrompt.includes('confidential') || lowerPrompt.includes('non-disclosure'))) return true;
            if (cat === 'freelance' && (lowerPrompt.includes('web') || lowerPrompt.includes('developer') || lowerPrompt.includes('contractor'))) return true;

            // Title word match
            return titleWords.some(word => word.length > 4 && lowerPrompt.includes(word));
        });

        if (match) {
            console.log(`[CONTRACT_GEN] ⚠️ AI failed, falling back to matched template: ${match.title}`);

            // Inject prompt into template placeholders if possible
            let content = match.defaultContent;

            if (content.includes('{{SCOPE_DESCRIPTION}}')) {
                content = content.replace('{{SCOPE_DESCRIPTION}}', prompt);
            } else if (content.includes('{{OBJECTIVE_1}}')) {
                content = content.replace('{{OBJECTIVE_1}}', prompt)
                    .replace('- {{OBJECTIVE_2}}', '')
                    .replace('- {{OBJECTIVE_3}}', '');
            }

            return {
                title: match.title,
                content: content
            };
        }
    } catch (err) {
        console.error('Error in fallback logic:', err);
    }

    // 2. Generic Fallback if no specific template found
    return {
        title: 'Draft Contract (AI Failed)',
        content: `# DRAFT CONTRACT

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
`
    };
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
        const result = await chatCompletion(prompt, {
            temperature: 0.5,
            maxTokens: 4096,
        });
        return result;
    } catch (error) {
        console.error('[CONTRACT_GEN] ❌ Error enhancing contract:', error);
        // Simple fallback: append the clause
        return `${existingContent}\n\n---\n\n## Additional Terms\n\n${clauseText}`;
    }
}
