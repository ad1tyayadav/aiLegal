import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import puppeteer from 'puppeteer';

// Generate HTML content for the PDF report
function generateReportHtml(results: any): string {
    const getRiskColor = (level: string) => {
        switch (level) {
            case 'CRITICAL': return { bg: '#FEE2E2', border: '#EF4444', text: '#DC2626' };
            case 'HIGH': return { bg: '#FFEDD5', border: '#F97316', text: '#EA580C' };
            case 'MEDIUM': return { bg: '#FEF9C3', border: '#EAB308', text: '#CA8A04' };
            case 'LOW': return { bg: '#DBEAFE', border: '#3B82F6', text: '#2563EB' };
            default: return { bg: '#F3F4F6', border: '#9CA3AF', text: '#6B7280' };
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 70) return '#DC2626';
        if (score >= 40) return '#F97316';
        return '#22C55E';
    };

    const riskyClausesHtml = results.riskyClauses?.map((clause: any, index: number) => {
        const colors = getRiskColor(clause.riskLevel);
        return `
            <div style="background-color: ${colors.bg}; border-left: 4px solid ${colors.border}; border-radius: 8px; padding: 16px 20px; margin-bottom: 16px; page-break-inside: avoid;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                    <div>
                        <span style="display: inline-block; padding: 4px 10px; background-color: ${colors.border}; color: #FFFFFF; border-radius: 4px; font-size: 12px; font-weight: 600;">
                            ${clause.riskLevel}
                        </span>
                        <span style="margin-left: 8px; font-size: 14px; color: #6B7280;">
                            Clause #${clause.clauseNumber || index + 1}
                        </span>
                    </div>
                </div>
                <div style="background-color: rgba(255,255,255,0.7); padding: 12px; border-radius: 6px; margin-bottom: 12px; font-size: 13px; font-style: italic; color: #374151; line-height: 1.5;">
                    "${clause.originalText?.substring(0, 250) || ''}..."
                </div>
                <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #1F2937;">
                    <strong>👤 For You:</strong> ${clause.explanation?.freelancer?.simple || clause.explanation?.freelancer?.simpleExplanation || 'Review this clause carefully.'}
                </p>
            </div>
        `;
    }).join('') || '<p>No risky clauses found.</p>';

    return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>* { box-sizing: border-box; margin: 0; padding: 0; } body { font-family: system-ui, -apple-system, sans-serif; }</style></head>
<body>
    <div class="print-report" style="max-width: 800px; margin: 0 auto; padding: 40px; background-color: #ffffff; color: #1F2937;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #E5E7EB;">
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 40px; height: 40px; border-radius: 8px; background-color: #1F2937; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: bold; font-size: 18px;">अ</div>
                <div>
                    <h1 style="margin: 0; font-size: 24px; font-weight: bold;">Contract Analysis Report</h1>
                    <p style="margin: 4px 0 0 0; color: #6B7280; font-size: 14px;">AndhaKanoon Legal AI</p>
                </div>
            </div>
            <p style="margin: 0; font-size: 14px; color: #6B7280;">${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div style="background-color: #F9FAFB; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px;">
            <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #6B7280; text-transform: uppercase;">Document Analyzed</h3>
            <p style="margin: 0; font-size: 18px; font-weight: 600;">${results.document?.fileName || 'Contract'}</p>
        </div>
        <div style="border: 3px solid ${getScoreColor(results.analysis?.overallRiskScore || 0)}; border-radius: 12px; padding: 24px; margin-bottom: 32px; text-align: center;">
            <div style="font-size: 64px; font-weight: bold; color: ${getScoreColor(results.analysis?.overallRiskScore || 0)};">${results.analysis?.overallRiskScore || 0}</div>
            <div style="font-size: 14px; color: #6B7280;">out of 100</div>
            <div style="display: inline-block; margin-top: 12px; padding: 6px 16px; background-color: ${getScoreColor(results.analysis?.overallRiskScore || 0)}; color: #FFFFFF; border-radius: 20px; font-size: 14px; font-weight: 600;">${results.analysis?.riskLevel || 'UNKNOWN'} RISK</div>
        </div>
        <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 16px;">⚠️ Risky Clauses (${results.riskyClauses?.length || 0})</h2>
        ${riskyClausesHtml}
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB; font-size: 11px; color: #9CA3AF;">
            <strong>⚖️ Disclaimer:</strong> This analysis is for informational purposes only and does not constitute legal advice.
        </div>
    </div>
</body>
</html>`;
}

// Generate PDF from analysis data
async function generatePdfBuffer(analysisData: any): Promise<Buffer> {
    console.log('[PDF] 📄 Generating PDF for email attachment...');

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 800, height: 1200, deviceScaleFactor: 2 });

    const htmlContent = generateReportHtml(analysisData);
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.print-report', { timeout: 5000 });

    const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' }
    });

    await browser.close();
    console.log(`[PDF] ✅ Generated ${pdfBuffer.length} bytes`);

    return Buffer.from(pdfBuffer);
}

export async function POST(request: NextRequest) {
    try {
        const { email, results, attachPdf } = await request.json();

        if (!email || !results) {
            return NextResponse.json({ success: false, error: 'Missing email or results' }, { status: 400 });
        }

        // Gmail SMTP Configuration
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const riskyClausesHtml = results.riskyClauses
            .filter((c: any) => c.riskLevel === 'CRITICAL' || c.riskLevel === 'HIGH')
            .slice(0, 5)
            .map((c: any) => `
                <div style="margin-bottom: 20px; padding: 15px; border-left: 4px solid ${c.riskLevel === 'CRITICAL' ? '#ef4444' : '#f97316'}; background-color: #f9fafb;">
                    <h3 style="margin: 0 0 10px 0; color: #111827;">Clause ${c.clauseNumber} (${c.riskLevel})</h3>
                    <p style="margin: 0 0 10px 0; font-style: italic; color: #4b5563;">"${c.originalText.substring(0, 200)}..."</p>
                    <p style="margin: 0; color: #374151;"><strong>Risk:</strong> ${c.explanation?.freelancer?.simple || c.explanation?.freelancer?.simpleExplanation || 'Review carefully.'}</p>
                </div>
            `).join('');

        const pdfNote = attachPdf ? '<p style="color: #16a34a; font-weight: bold;">📎 Full color-coded report attached as PDF</p>' : '';

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <div style="background-color: #1a1a1a; padding: 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0;">AndhaKanoon Analysis</h1>
                </div>
                <div style="padding: 20px; border: 1px solid #e5e7eb;">
                    <p>Hello,</p>
                    <p>Here is the legal risk analysis for: <strong>${results.document.fileName}</strong></p>
                    ${pdfNote}
                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
                        <span style="font-size: 14px; color: #6b7280; display: block; margin-bottom: 5px;">Overall Risk Score</span>
                        <span style="font-size: 32px; font-weight: bold; color: ${results.analysis.overallRiskScore >= 70 ? '#ef4444' : '#f97316'};">
                            ${results.analysis.overallRiskScore}/100
                        </span>
                    </div>
                    <h2>Top Risk Clauses</h2>
                    ${riskyClausesHtml || '<p>No critical or high risk clauses found.</p>'}
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
                    <p style="font-size: 12px; color: #9ca3af; text-align: center;">Generated by AndhaKanoon AI</p>
                </div>
            </div>
        `;

        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log('--- EMAIL MOCK MODE ---');
            console.log({ recipient: email, attachPdf, status: 'Simulated' });
            return NextResponse.json({ success: true, message: 'Mock email sent' });
        }

        const mailOptions: any = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: `Legal Analysis Report: ${results.document.fileName}`,
            html: htmlContent
        };

        if (attachPdf) {
            try {
                const pdfBuffer = await generatePdfBuffer(results);
                mailOptions.attachments = [{
                    filename: `AndhaKanoon_Report.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }];
                console.log('[EMAIL] 📎 PDF attached');
            } catch (pdfError: any) {
                console.error('[EMAIL] ⚠️ PDF failed:', pdfError.message);
            }
        }

        await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] ✅ Sent to ${email}`);

        return NextResponse.json({ success: true, pdfAttached: !!mailOptions.attachments });

    } catch (error: any) {
        console.error('Email error:', error.message);
        return NextResponse.json({ success: false, error: 'Failed to send email' }, { status: 500 });
    }
}
