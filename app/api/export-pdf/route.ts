import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

// PDF Template HTML wrapper
function generatePDFHTML(content: string, options: {
    headerImage?: string;
    signatureImage?: string;
    isDraft?: boolean;
    companyName?: string;
}): string {
    const { headerImage, signatureImage, isDraft, companyName } = options;

    // Convert markdown-like content to basic HTML
    let htmlContent = content
        .replace(/^# (.*)$/gm, '<h1>$1</h1>')
        .replace(/^## (.*)$/gm, '<h2>$1</h2>')
        .replace(/^### (.*)$/gm, '<h3>$1</h3>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/^- (.*)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
        .replace(/^---$/gm, '<hr/>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br/>');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.6;
            color: #1a1a1a;
            padding: 40px 60px;
            position: relative;
        }
        
        /* Draft watermark */
        ${isDraft ? `
        body::before {
            content: 'DRAFT';
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 120pt;
            font-weight: 700;
            color: rgba(200, 200, 200, 0.3);
            z-index: -1;
            pointer-events: none;
        }
        ` : ''}
        
        /* Header */
        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .header img {
            max-height: 60px;
            max-width: 200px;
        }
        
        .header-text {
            text-align: right;
            font-size: 10pt;
            color: #666;
        }
        
        /* Content */
        h1 {
            font-size: 18pt;
            font-weight: 700;
            color: #1e3a5f;
            margin-bottom: 20px;
            text-align: center;
        }
        
        h2 {
            font-size: 14pt;
            font-weight: 600;
            color: #2563eb;
            margin: 20px 0 10px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 5px;
        }
        
        h3 {
            font-size: 12pt;
            font-weight: 600;
            margin: 15px 0 8px;
        }
        
        p {
            margin: 10px 0;
            text-align: justify;
        }
        
        ul {
            margin: 10px 0 10px 20px;
        }
        
        li {
            margin: 5px 0;
        }
        
        hr {
            border: none;
            border-top: 1px solid #e5e7eb;
            margin: 20px 0;
        }
        
        strong {
            font-weight: 600;
        }
        
        /* Signature section */
        .signature-section {
            margin-top: 50px;
            page-break-inside: avoid;
        }
        
        .signature-box {
            display: inline-block;
            width: 45%;
            margin-right: 5%;
            vertical-align: top;
        }
        
        .signature-line {
            border-top: 1px solid #1a1a1a;
            margin-top: 60px;
            padding-top: 5px;
        }
        
        .signature-img {
            max-width: 150px;
            max-height: 60px;
            margin-bottom: -60px;
            position: relative;
            z-index: 1;
        }
        
        /* Footer */
        .footer {
            position: fixed;
            bottom: 20px;
            left: 60px;
            right: 60px;
            font-size: 9pt;
            color: #666;
            text-align: center;
            border-top: 1px solid #e5e7eb;
            padding-top: 10px;
        }
        
        @media print {
            body {
                padding: 0;
            }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        ${headerImage ? `<img src="${headerImage}" alt="Company Logo"/>` : `<div></div>`}
        <div class="header-text">
            ${companyName ? `<strong>${companyName}</strong><br/>` : ''}
            Generated on ${new Date().toLocaleDateString('en-IN')}
        </div>
    </div>
    
    <!-- Content -->
    <div class="content">
        <p>${htmlContent}</p>
    </div>
    
    <!-- Signature (if provided) -->
    ${signatureImage ? `
    <div class="signature-section">
        <div class="signature-box">
            <img src="${signatureImage}" alt="Signature" class="signature-img"/>
            <div class="signature-line">
                Authorized Signature<br/>
                Date: ${new Date().toLocaleDateString('en-IN')}
            </div>
        </div>
    </div>
    ` : ''}
    
    <!-- Footer -->
    <div class="footer">
        ${isDraft ? 'DRAFT - For Review Only' : 'Confidential Document'} | Page 1
    </div>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { content, headerImage, signatureImage, isDraft, companyName, filename } = body;

        if (!content) {
            return NextResponse.json(
                { success: false, error: 'Content is required' },
                { status: 400 }
            );
        }

        // Generate HTML
        const html = generatePDFHTML(content, {
            headerImage,
            signatureImage,
            isDraft: isDraft ?? true,
            companyName
        });

        // Launch Puppeteer and generate PDF
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20mm',
                bottom: '30mm',
                left: '15mm',
                right: '15mm'
            }
        });

        await browser.close();

        // Return PDF as download
        const pdfFilename = filename || `contract_${Date.now()}.pdf`;

        // Convert Uint8Array to Buffer for NextResponse compatibility
        const buffer = Buffer.from(pdfBuffer);

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${pdfFilename}"`,
                'Content-Length': buffer.length.toString()
            }
        });

    } catch (error) {
        console.error('[API] export-pdf error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to generate PDF' },
            { status: 500 }
        );
    }
}
