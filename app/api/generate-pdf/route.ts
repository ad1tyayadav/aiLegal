import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

// Generate HTML content for the report with color-coded contract text
function generateReportHtml(results: any): string {
    const getRiskColor = (level: string) => {
        switch (level) {
            case 'CRITICAL': return { bg: '#FEE2E2', border: '#EF4444', text: '#DC2626', underline: '#EF4444' };
            case 'HIGH': return { bg: '#FEF3C7', border: '#F59E0B', text: '#D97706', underline: '#F59E0B' };
            case 'MEDIUM': return { bg: '#FEF9C3', border: '#EAB308', text: '#CA8A04', underline: '#EAB308' };
            case 'LOW': return { bg: '#DBEAFE', border: '#3B82F6', text: '#2563EB', underline: '#3B82F6' };
            default: return { bg: '#F3F4F6', border: '#9CA3AF', text: '#6B7280', underline: '#9CA3AF' };
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 70) return '#DC2626';
        if (score >= 40) return '#F97316';
        return '#22C55E';
    };

    // Generate color-coded contract text with inline highlighting
    const generateColorCodedContract = () => {
        const contractText = results.document?.extractedText || '';
        if (!contractText || !results.riskyClauses?.length) {
            return `<p style="color: #6B7280; font-style: italic;">Contract text not available.</p>`;
        }

        // Create a map of risky clause positions
        const clauseMarkers: Array<{
            start: number;
            end: number;
            text: string;
            riskLevel: string;
            clauseNumber: number;
        }> = [];

        results.riskyClauses.forEach((clause: any, index: number) => {
            const clauseText = clause.originalText || '';
            if (clauseText.length > 20) {
                // Find the clause in the contract text
                const startIndex = contractText.indexOf(clauseText);
                if (startIndex !== -1) {
                    clauseMarkers.push({
                        start: startIndex,
                        end: startIndex + clauseText.length,
                        text: clauseText,
                        riskLevel: clause.riskLevel,
                        clauseNumber: clause.clauseNumber || index + 1
                    });
                }
            }
        });

        // Sort by start position
        clauseMarkers.sort((a, b) => a.start - b.start);

        // Build HTML with highlighted sections
        let html = '';
        let lastIndex = 0;

        clauseMarkers.forEach((marker) => {
            // Add text before this marker
            if (marker.start > lastIndex) {
                const beforeText = contractText.slice(lastIndex, marker.start);
                html += `<span style="color: #374151;">${escapeHtml(beforeText)}</span>`;
            }

            // Add highlighted clause
            const colors = getRiskColor(marker.riskLevel);
            html += `<span style="background-color: ${colors.bg}; border-bottom: 2px solid ${colors.underline}; padding: 2px 4px; border-radius: 3px;" title="${marker.riskLevel} Risk - Clause #${marker.clauseNumber}">${escapeHtml(marker.text)}</span>`;

            lastIndex = marker.end;
        });

        // Add remaining text
        if (lastIndex < contractText.length) {
            html += `<span style="color: #374151;">${escapeHtml(contractText.slice(lastIndex))}</span>`;
        }

        return html;
    };

    // Escape HTML entities
    const escapeHtml = (text: string) => {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/\n/g, '<br/>');
    };

    const riskyClausesHtml = results.riskyClauses?.map((clause: any, index: number) => {
        const colors = getRiskColor(clause.riskLevel);

        // Get explanations for both roles
        const freelancerExplanation = clause.explanation?.freelancer?.simple || clause.explanation?.freelancer?.simpleExplanation || '';
        const companyExplanation = clause.explanation?.company?.simple || clause.explanation?.company?.simpleExplanation || '';
        const freelancerImpact = clause.explanation?.freelancer?.realLifeImpact || clause.explanation?.freelancer?.impact || '';
        const companyImpact = clause.explanation?.company?.realLifeImpact || clause.explanation?.company?.impact || '';

        return `
            <div style="background-color: ${colors.bg}; border-left: 4px solid ${colors.border}; border-radius: 8px; padding: 20px; margin-bottom: 20px; page-break-inside: avoid;">
                <!-- Header -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                    <div>
                        <span style="display: inline-block; padding: 6px 12px; background-color: ${colors.border}; color: #FFFFFF; border-radius: 4px; font-size: 12px; font-weight: 700; text-transform: uppercase;">
                            ${clause.riskLevel}
                        </span>
                        <span style="margin-left: 10px; font-size: 16px; font-weight: 600; color: #1F2937;">
                            Clause #${clause.clauseNumber || index + 1}
                        </span>
                    </div>
                    <span style="padding: 4px 10px; background-color: rgba(0,0,0,0.1); border-radius: 4px; font-size: 11px; color: ${colors.text}; font-weight: 500;">
                        ${clause.violationType?.replace(/_/g, ' ').toUpperCase() || 'RISK'}
                    </span>
                </div>

                <!-- Role-Based Explanations -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                    <!-- Freelancer Perspective -->
                    <div style="background-color: rgba(255,255,255,0.8); padding: 12px; border-radius: 6px; border: 1px solid rgba(0,0,0,0.1);">
                        <div style="font-size: 11px; font-weight: 600; color: #6B7280; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
                            👤 FOR YOU (Freelancer)
                        </div>
                        <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #1F2937;">
                            ${freelancerExplanation || 'Review this clause carefully before signing.'}
                        </p>
                        ${freelancerImpact ? `
                            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(0,0,0,0.1);">
                                <div style="font-size: 10px; font-weight: 600; color: #059669; margin-bottom: 4px;">💡 Real-World Impact</div>
                                <p style="margin: 0; font-size: 11px; line-height: 1.4; color: #374151;">${freelancerImpact}</p>
                            </div>
                        ` : ''}
                    </div>
                    
                    <!-- Company Perspective -->
                    <div style="background-color: rgba(255,255,255,0.8); padding: 12px; border-radius: 6px; border: 1px solid rgba(0,0,0,0.1);">
                        <div style="font-size: 11px; font-weight: 600; color: #6B7280; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
                            🏢 FOR COMPANY
                        </div>
                        <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #1F2937;">
                            ${companyExplanation || 'Standard business protection clause.'}
                        </p>
                        ${companyImpact ? `
                            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(0,0,0,0.1);">
                                <div style="font-size: 10px; font-weight: 600; color: #2563EB; margin-bottom: 4px;">💡 Business Impact</div>
                                <p style="margin: 0; font-size: 11px; line-height: 1.4; color: #374151;">${companyImpact}</p>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Legal Reference -->
                ${clause.indianLawReference ? `
                    <div style="background-color: #F0FDF4; border: 1px solid #86EFAC; border-radius: 6px; padding: 12px; margin-bottom: 16px;">
                        <div style="font-size: 11px; font-weight: 600; color: #166534; margin-bottom: 6px;">
                            📜 INDIAN LAW REFERENCE
                        </div>
                        <div style="font-size: 14px; font-weight: 600; color: #15803D; margin-bottom: 4px;">
                            ${clause.indianLawReference.sectionNumber || 'Legal Reference'}
                        </div>
                        <div style="font-size: 12px; font-weight: 500; color: #166534; margin-bottom: 8px;">
                            ${clause.indianLawReference.title || clause.indianLawReference.act || ''}
                        </div>
                        <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #374151;">
                            ${clause.indianLawReference.summary || clause.indianLawReference.description || clause.indianLawReference.text || ''}
                        </p>
                    </div>
                ` : ''}

                <!-- Original Clause Text -->
                <div style="background-color: rgba(255,255,255,0.9); border: 1px dashed rgba(0,0,0,0.2); border-radius: 6px; padding: 12px;">
                    <div style="font-size: 11px; font-weight: 600; color: #6B7280; margin-bottom: 6px;">
                        📄 ORIGINAL CLAUSE TEXT
                    </div>
                    <p style="margin: 0; font-size: 11px; line-height: 1.6; color: #4B5563; font-style: italic;">
                        "${clause.originalText?.substring(0, 500) || ''}${clause.originalText?.length > 500 ? '...' : ''}"
                    </p>
                </div>
            </div>
        `;
    }).join('') || '<p>No risky clauses found.</p>';

    const breakdownHtml = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
        .filter(level => results.analysis?.breakdown?.[level] > 0)
        .map(level => {
            const colors: Record<string, string> = { CRITICAL: '#DC2626', HIGH: '#EA580C', MEDIUM: '#CA8A04', LOW: '#2563EB' };
            return `
                <div style="text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; color: ${colors[level]};">
                        ${results.analysis.breakdown[level]}
                    </div>
                    <div style="font-size: 12px; color: ${colors[level]};">${level.charAt(0) + level.slice(1).toLowerCase()}</div>
                </div>
            `;
        }).join('');

    // Color legend
    const legendHtml = `
        <div style="display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; padding: 12px; background-color: #F9FAFB; border-radius: 8px;">
            <span style="font-size: 12px; color: #6B7280;"><strong>Legend:</strong></span>
            <span style="font-size: 12px;"><span style="background-color: #FEE2E2; padding: 2px 8px; border-radius: 4px; border-bottom: 2px solid #EF4444;">Critical</span></span>
            <span style="font-size: 12px;"><span style="background-color: #FEF3C7; padding: 2px 8px; border-radius: 4px; border-bottom: 2px solid #F59E0B;">High</span></span>
            <span style="font-size: 12px;"><span style="background-color: #FEF9C3; padding: 2px 8px; border-radius: 4px; border-bottom: 2px solid #EAB308;">Medium</span></span>
            <span style="font-size: 12px;"><span style="background-color: #DBEAFE; padding: 2px 8px; border-radius: 4px; border-bottom: 2px solid #3B82F6;">Low</span></span>
        </div>
    `;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, -apple-system, sans-serif; }
        @page { margin: 15mm; }
    </style>
</head>
<body>
    <div class="print-report" style="max-width: 800px; margin: 0 auto; padding: 40px; background-color: #ffffff; color: #1F2937;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #E5E7EB;">
            <div>
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                    <div style="width: 40px; height: 40px; border-radius: 8px; background-color: #1F2937; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: bold; font-size: 18px;">अ</div>
                    <div>
                        <h1 style="margin: 0; font-size: 24px; font-weight: bold;">Contract Analysis Report</h1>
                        <p style="margin: 4px 0 0 0; color: #6B7280; font-size: 14px;">AndhaKanoon Legal AI</p>
                    </div>
                </div>
            </div>
            <div style="text-align: right;">
                <p style="margin: 0; font-size: 14px; color: #6B7280;">
                    Generated: ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </div>
        </div>

        <!-- Document Info -->
        <div style="background-color: #F9FAFB; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px;">
            <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em;">Document Analyzed</h3>
            <p style="margin: 0; font-size: 18px; font-weight: 600;">${results.document?.fileName || 'Contract Document'}</p>
            <p style="margin: 4px 0 0 0; color: #6B7280; font-size: 14px;">${results.analysis?.totalClauses || 0} clauses analyzed</p>
        </div>

        <!-- Risk Score Card -->
        <div style="background-color: #FFFFFF; border: 3px solid ${getScoreColor(results.analysis?.overallRiskScore || 0)}; border-radius: 12px; padding: 24px; margin-bottom: 32px; text-align: center;">
            <div style="font-size: 64px; font-weight: bold; color: ${getScoreColor(results.analysis?.overallRiskScore || 0)}; line-height: 1;">
                ${results.analysis?.overallRiskScore || 0}
            </div>
            <div style="font-size: 14px; color: #6B7280; margin-top: 4px;">out of 100</div>
            <div style="display: inline-block; margin-top: 12px; padding: 6px 16px; background-color: ${getScoreColor(results.analysis?.overallRiskScore || 0)}; color: #FFFFFF; border-radius: 20px; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">
                ${results.analysis?.riskLevel || 'UNKNOWN'} RISK
            </div>
            <div style="display: flex; justify-content: center; gap: 24px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
                ${breakdownHtml}
            </div>
        </div>

        <!-- COLOR-CODED CONTRACT TEXT SECTION -->
        <div style="page-break-before: always;"></div>
        <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 16px; color: #1F2937;">
            📄 Full Contract with Color-Coded Highlights
        </h2>
        ${legendHtml}
        <div style="background-color: #FAFAFA; border: 1px solid #E5E7EB; border-radius: 8px; padding: 20px; margin-bottom: 32px; font-size: 13px; line-height: 1.8; white-space: pre-wrap; word-wrap: break-word;">
            ${generateColorCodedContract()}
        </div>

        <!-- Risky Clauses Detailed -->
        <div style="page-break-before: always;"></div>
        <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 16px; color: #1F2937;">
            ⚠️ Risky Clauses - Detailed Analysis (${results.riskyClauses?.length || 0})
        </h2>
        ${riskyClausesHtml}

        <!-- Disclaimer -->
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB; font-size: 11px; color: #9CA3AF; line-height: 1.6;">
            <strong>⚖️ Disclaimer:</strong> ${results.disclaimer || 'This analysis is for informational purposes only and does not constitute legal advice. Please consult a qualified legal professional for specific legal matters.'}
        </div>

        <!-- Footer -->
        <div style="margin-top: 32px; text-align: center; font-size: 12px; color: #9CA3AF;">
            Generated by AndhaKanoon Legal AI • ${new Date().getFullYear()}
        </div>
    </div>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
    const startTime = Date.now();
    console.log('[PDF] 📄 Starting PDF generation...');

    try {
        const body = await request.json();
        const { analysisData } = body;

        if (!analysisData) {
            return NextResponse.json(
                { success: false, error: 'Analysis data is required' },
                { status: 400 }
            );
        }

        console.log('[PDF] 🌐 Launching browser...');

        // Launch Puppeteer
        const browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--font-render-hinting=none'
            ]
        });

        const page = await browser.newPage();

        // Set viewport for consistent rendering
        await page.setViewport({
            width: 800,
            height: 1200,
            deviceScaleFactor: 2
        });

        console.log('[PDF] 📝 Rendering HTML content...');

        // Generate HTML and set it directly (no URL navigation needed)
        const htmlContent = generateReportHtml(analysisData);
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        // Wait for content
        await page.waitForSelector('.print-report', { timeout: 5000 });

        console.log('[PDF] 🖨️ Generating PDF...');

        // Generate PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '15mm',
                right: '15mm',
                bottom: '15mm',
                left: '15mm'
            }
        });

        await browser.close();

        const duration = Date.now() - startTime;
        console.log(`[PDF] ✅ PDF generated in ${duration}ms (${pdfBuffer.length} bytes)`);

        // Convert to Buffer for NextResponse
        const buffer = Buffer.from(pdfBuffer);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="contract-analysis-${Date.now()}.pdf"`,
                'Content-Length': buffer.length.toString()
            }
        });

    } catch (error: any) {
        console.error('[PDF] ❌ Error generating PDF:', error.message);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to generate PDF' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    return NextResponse.json({
        success: true,
        message: 'PDF generation endpoint is ready',
        usage: 'POST with { analysisData: {...} }'
    });
}
