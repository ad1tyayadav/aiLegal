import { NextRequest, NextResponse } from 'next/server';
import {
    createSignature,
    getSignaturesByUser,
    getSignatureById,
    deleteSignature
} from '@/lib/services/contractManager.service';

// GET /api/signatures - List user's signatures
export async function GET() {
    try {
        const signatures = getSignaturesByUser();
        return NextResponse.json({ success: true, signatures });
    } catch (error) {
        console.error('[API] signatures GET error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch signatures' },
            { status: 500 }
        );
    }
}

// POST /api/signatures - Upload a new signature
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { label, imageData } = body;

        if (!label || !imageData) {
            return NextResponse.json(
                { success: false, error: 'Label and imageData are required' },
                { status: 400 }
            );
        }

        // Validate that imageData is a valid base64 image
        if (!imageData.startsWith('data:image/')) {
            return NextResponse.json(
                { success: false, error: 'imageData must be a base64 encoded image' },
                { status: 400 }
            );
        }

        const signature = createSignature({ label, imageData });
        return NextResponse.json({ success: true, signature });

    } catch (error) {
        console.error('[API] signatures POST error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create signature' },
            { status: 500 }
        );
    }
}

// DELETE /api/signatures - Delete a signature
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Signature ID is required' },
                { status: 400 }
            );
        }

        const deleted = deleteSignature(id);

        if (!deleted) {
            return NextResponse.json(
                { success: false, error: 'Signature not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('[API] signatures DELETE error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete signature' },
            { status: 500 }
        );
    }
}
