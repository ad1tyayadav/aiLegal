import { NextResponse } from 'next/server';
import { getDatabaseStats } from '@/lib/db/queries';

export async function GET() {
    try {
        const stats = getDatabaseStats();

        return NextResponse.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: {
                connected: true,
                ...stats
            },
            services: {
                pdfExtractor: 'operational',
                indianLawValidator: 'operational',
                huggingfaceAI: 'operational'
            }
        });
    } catch (error) {
        return NextResponse.json(
            {
                status: 'unhealthy',
                error: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
