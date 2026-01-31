import { NextRequest, NextResponse } from 'next/server';
import { generateContractDraft, enhanceContract } from '@/lib/services/contractGenerator.service';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { prompt, templateId, action, existingContent, clauseText } = body;

        if (action === 'enhance' && existingContent && clauseText) {
            // Enhance existing contract with a clause
            const enhanced = await enhanceContract(existingContent, clauseText);
            return NextResponse.json({
                success: true,
                content: enhanced
            });
        }

        if (!prompt) {
            return NextResponse.json(
                { success: false, error: 'Prompt is required' },
                { status: 400 }
            );
        }

        const result = await generateContractDraft(prompt, templateId);

        return NextResponse.json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error('[API] generate-contract error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to generate contract' },
            { status: 500 }
        );
    }
}
