import { NextRequest, NextResponse } from 'next/server';
import {
    createContract,
    getContractsByUser,
    getContractById,
    updateContract,
    deleteContract,
    getTemplates,
    getClauses,
    getClauseCategories,
    getTemplateCategories
} from '@/lib/services/contractManager.service';

// GET /api/contracts - List contracts, templates, or clauses
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'contracts';
        const category = searchParams.get('category') || undefined;
        const id = searchParams.get('id');

        switch (type) {
            case 'contracts':
                if (id) {
                    const contract = getContractById(id);
                    if (!contract) {
                        return NextResponse.json(
                            { success: false, error: 'Contract not found' },
                            { status: 404 }
                        );
                    }
                    return NextResponse.json({ success: true, contract });
                }
                const contracts = getContractsByUser();
                return NextResponse.json({ success: true, contracts });

            case 'templates':
                const templates = getTemplates(category);
                const templateCategories = getTemplateCategories();
                return NextResponse.json({ success: true, templates, categories: templateCategories });

            case 'clauses':
                const clauses = getClauses(category);
                const clauseCategories = getClauseCategories();
                return NextResponse.json({ success: true, clauses, categories: clauseCategories });

            default:
                return NextResponse.json(
                    { success: false, error: 'Invalid type' },
                    { status: 400 }
                );
        }

    } catch (error) {
        console.error('[API] contracts GET error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch data' },
            { status: 500 }
        );
    }
}

// POST /api/contracts - Create a new contract/draft
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { title, content, status, templateId } = body;

        if (!title || !content) {
            return NextResponse.json(
                { success: false, error: 'Title and content are required' },
                { status: 400 }
            );
        }

        const contract = createContract({
            title,
            content,
            status: status || 'draft',
            templateId
        });

        return NextResponse.json({ success: true, contract });

    } catch (error) {
        console.error('[API] contracts POST error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create contract' },
            { status: 500 }
        );
    }
}

// PUT /api/contracts - Update a contract
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, title, content, status } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Contract ID is required' },
                { status: 400 }
            );
        }

        const updated = updateContract(id, { title, content, status });

        if (!updated) {
            return NextResponse.json(
                { success: false, error: 'Contract not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, contract: updated });

    } catch (error) {
        console.error('[API] contracts PUT error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update contract' },
            { status: 500 }
        );
    }
}

// DELETE /api/contracts - Delete a contract
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Contract ID is required' },
                { status: 400 }
            );
        }

        const deleted = deleteContract(id);

        if (!deleted) {
            return NextResponse.json(
                { success: false, error: 'Contract not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('[API] contracts DELETE error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete contract' },
            { status: 500 }
        );
    }
}
