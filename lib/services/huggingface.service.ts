/**
 * Hugging Face Inference Service
 * 
 * Provides AI capabilities using HuggingFace InferenceClient.
 * Supports multi-key fallback (HF_TOKEN and HF_TOKEN1).
 */

import { InferenceClient } from "@huggingface/inference";

// Available tokens for fallback
const HF_TOKENS = [
    process.env.HF_TOKEN,
    process.env.HF_TOKEN1,
].filter(Boolean) as string[];

// Default model for chat completions
export const DEFAULT_MODEL = "Qwen/Qwen3-Next-80B-A3B-Instruct:novita";

// Embedding model (using sentence-transformers for embeddings)
export const EMBEDDING_MODEL = "sentence-transformers/all-mpnet-base-v2";

/**
 * Create an InferenceClient with the specified token
 */
function createClient(token: string): InferenceClient {
    return new InferenceClient(token);
}

/**
 * Execute a chat completion with automatic token fallback
 */
export async function chatCompletion(
    prompt: string,
    options?: {
        model?: string;
        systemPrompt?: string;
        temperature?: number;
        maxTokens?: number;
    }
): Promise<string> {
    const model = options?.model || DEFAULT_MODEL;
    let lastError: Error | null = null;

    for (let tokenIndex = 0; tokenIndex < HF_TOKENS.length; tokenIndex++) {
        const token = HF_TOKENS[tokenIndex];
        const client = createClient(token);

        try {
            console.log(`[HF] 🤖 Attempting with token ${tokenIndex + 1}/${HF_TOKENS.length}, model: ${model}`);

            const messages: { role: "user" | "assistant" | "system"; content: string }[] = [];

            if (options?.systemPrompt) {
                messages.push({ role: "system", content: options.systemPrompt });
            }
            messages.push({ role: "user", content: prompt });

            const completion = await client.chatCompletion({
                model,
                messages,
                temperature: options?.temperature ?? 0.7,
                max_tokens: options?.maxTokens ?? 2048,
            });

            const responseText = completion.choices[0]?.message?.content;
            if (!responseText) {
                throw new Error("Empty response from HuggingFace");
            }

            console.log(`[HF] ✅ Success with token ${tokenIndex + 1}`);
            return responseText;

        } catch (error: any) {
            console.warn(`[HF] ⚠️ Token ${tokenIndex + 1} failed:`, error.message);
            lastError = error;

            // If rate limited, wait before trying next token
            if (error.message?.includes('429') || error.message?.includes('rate')) {
                console.log(`[HF] ⏳ Rate limited, waiting 2s before next token...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }

    throw lastError || new Error("All HuggingFace tokens failed");
}

/**
 * Get text embeddings using HuggingFace
 */
export async function getTextEmbedding(text: string): Promise<number[]> {
    let lastError: Error | null = null;

    for (let tokenIndex = 0; tokenIndex < HF_TOKENS.length; tokenIndex++) {
        const token = HF_TOKENS[tokenIndex];
        const client = createClient(token);

        try {
            console.log(`[HF-EMBED] 🔄 Generating embedding with token ${tokenIndex + 1}/${HF_TOKENS.length}`);

            const result = await client.featureExtraction({
                model: EMBEDDING_MODEL,
                inputs: text,
            });

            // Result is number[] or number[][]
            const embedding = Array.isArray(result[0]) ? result[0] : result;

            console.log(`[HF-EMBED] ✅ Generated ${(embedding as number[]).length}-dim vector`);
            return embedding as number[];

        } catch (error: any) {
            console.warn(`[HF-EMBED] ⚠️ Token ${tokenIndex + 1} failed:`, error.message);
            lastError = error;

            if (error.message?.includes('429') || error.message?.includes('rate')) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }

    throw lastError || new Error("All HuggingFace tokens failed for embedding");
}

/**
 * Check if HuggingFace is configured
 */
export function isHuggingFaceConfigured(): boolean {
    return HF_TOKENS.length > 0;
}
