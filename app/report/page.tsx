'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

interface AnalysisResult {
    document: {
        fileName: string;
        fileSize: number;
        fileType: string;
        extractedText: string;
    };
    analysis: {
        overallRiskScore: number;
        riskLevel: string;
        totalClauses: number;
        riskyClausesFound: number;
        breakdown: {
            CRITICAL: number;
            HIGH: number;
            MEDIUM: number;
            LOW: number;
        };
    };
    riskyClauses: any[];
    deviations: any[];
    disclaimer: string;
}

function ReportContent() {
    const searchParams = useSearchParams();
    const [results, setResults] = useState<AnalysisResult | null>(null);

    useEffect(() => {
        // Try to get data from URL params (base64 encoded) or localStorage
        const dataParam = searchParams.get('data');
        if (dataParam) {
            try {
                const decoded = JSON.parse(atob(dataParam));
                setResults(decoded);
            } catch (e) {
                console.error('Failed to decode data from URL');
            }
        } else {
            // Fallback to localStorage
            const saved = localStorage.getItem('andhakanoon_analysis_result');
            if (saved) {
                setResults(JSON.parse(saved));
            }
        }
    }, [searchParams]);

    if (!results) {
        return (
            <div className="p-8 text-center text-gray-500">
                Loading report data...
            </div>
        );
    }

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

    return (
        <div className="print-report" style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            maxWidth: '800px',
            margin: '0 auto',
            padding: '40px',
            backgroundColor: '#ffffff',
            color: '#1F2937'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '32px',
                paddingBottom: '24px',
                borderBottom: '2px solid #E5E7EB'
            }}>
                <div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '8px'
                    }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            backgroundColor: '#1F2937',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontWeight: 'bold',
                            fontSize: '18px'
                        }}>अ</div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
                                Contract Analysis Report
                            </h1>
                            <p style={{ margin: '4px 0 0 0', color: '#6B7280', fontSize: '14px' }}>
                                AndhaKanoon Legal AI
                            </p>
                        </div>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontSize: '14px', color: '#6B7280' }}>
                        Generated: {new Date().toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </p>
                </div>
            </div>

            {/* Document Info */}
            <div style={{
                backgroundColor: '#F9FAFB',
                padding: '16px 20px',
                borderRadius: '8px',
                marginBottom: '24px'
            }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Document Analyzed
                </h3>
                <p style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                    {results.document.fileName}
                </p>
                <p style={{ margin: '4px 0 0 0', color: '#6B7280', fontSize: '14px' }}>
                    {results.analysis.totalClauses} clauses analyzed
                </p>
            </div>

            {/* Risk Score Card */}
            <div style={{
                backgroundColor: '#FFFFFF',
                border: `3px solid ${getScoreColor(results.analysis.overallRiskScore)}`,
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '32px',
                textAlign: 'center'
            }}>
                <div style={{
                    fontSize: '64px',
                    fontWeight: 'bold',
                    color: getScoreColor(results.analysis.overallRiskScore),
                    lineHeight: 1
                }}>
                    {results.analysis.overallRiskScore}
                </div>
                <div style={{
                    fontSize: '14px',
                    color: '#6B7280',
                    marginTop: '4px'
                }}>
                    out of 100
                </div>
                <div style={{
                    display: 'inline-block',
                    marginTop: '12px',
                    padding: '6px 16px',
                    backgroundColor: getScoreColor(results.analysis.overallRiskScore),
                    color: '#FFFFFF',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                }}>
                    {results.analysis.riskLevel} RISK
                </div>

                {/* Breakdown */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '24px',
                    marginTop: '20px',
                    paddingTop: '20px',
                    borderTop: '1px solid #E5E7EB'
                }}>
                    {results.analysis.breakdown.CRITICAL > 0 && (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#DC2626' }}>
                                {results.analysis.breakdown.CRITICAL}
                            </div>
                            <div style={{ fontSize: '12px', color: '#DC2626' }}>Critical</div>
                        </div>
                    )}
                    {results.analysis.breakdown.HIGH > 0 && (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#EA580C' }}>
                                {results.analysis.breakdown.HIGH}
                            </div>
                            <div style={{ fontSize: '12px', color: '#EA580C' }}>High</div>
                        </div>
                    )}
                    {results.analysis.breakdown.MEDIUM > 0 && (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#CA8A04' }}>
                                {results.analysis.breakdown.MEDIUM}
                            </div>
                            <div style={{ fontSize: '12px', color: '#CA8A04' }}>Medium</div>
                        </div>
                    )}
                    {results.analysis.breakdown.LOW > 0 && (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563EB' }}>
                                {results.analysis.breakdown.LOW}
                            </div>
                            <div style={{ fontSize: '12px', color: '#2563EB' }}>Low</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Risky Clauses */}
            <h2 style={{
                fontSize: '20px',
                fontWeight: 'bold',
                marginBottom: '16px',
                color: '#1F2937'
            }}>
                ⚠️ Risky Clauses Identified ({results.riskyClauses.length})
            </h2>

            {results.riskyClauses.map((clause, index) => {
                const colors = getRiskColor(clause.riskLevel);
                return (
                    <div
                        key={index}
                        style={{
                            backgroundColor: colors.bg,
                            borderLeft: `4px solid ${colors.border}`,
                            borderRadius: '8px',
                            padding: '16px 20px',
                            marginBottom: '16px',
                            pageBreakInside: 'avoid'
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: '12px'
                        }}>
                            <div>
                                <span style={{
                                    display: 'inline-block',
                                    padding: '4px 10px',
                                    backgroundColor: colors.border,
                                    color: '#FFFFFF',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: '600'
                                }}>
                                    {clause.riskLevel}
                                </span>
                                <span style={{
                                    marginLeft: '8px',
                                    fontSize: '14px',
                                    color: '#6B7280'
                                }}>
                                    Clause #{clause.clauseNumber}
                                </span>
                            </div>
                            <span style={{
                                padding: '4px 8px',
                                backgroundColor: 'rgba(0,0,0,0.1)',
                                borderRadius: '4px',
                                fontSize: '12px',
                                color: colors.text
                            }}>
                                {clause.violationType?.replace(/_/g, ' ')}
                            </span>
                        </div>

                        {/* Original Text */}
                        <div style={{
                            backgroundColor: 'rgba(255,255,255,0.7)',
                            padding: '12px',
                            borderRadius: '6px',
                            marginBottom: '12px',
                            fontSize: '13px',
                            fontStyle: 'italic',
                            color: '#374151',
                            lineHeight: 1.5
                        }}>
                            "{clause.originalText?.substring(0, 300)}{clause.originalText?.length > 300 ? '...' : ''}"
                        </div>

                        {/* Explanation - Freelancer View */}
                        <div style={{ marginBottom: '8px' }}>
                            <p style={{
                                margin: 0,
                                fontSize: '13px',
                                lineHeight: 1.6,
                                color: '#1F2937'
                            }}>
                                <strong>👤 For You:</strong> {clause.explanation?.freelancer?.simple || clause.explanation?.freelancer?.simpleExplanation || 'Review this clause carefully.'}
                            </p>
                        </div>

                        {/* Indian Law Reference */}
                        {clause.indianLawReference && (
                            <div style={{
                                marginTop: '12px',
                                paddingTop: '12px',
                                borderTop: '1px dashed rgba(0,0,0,0.2)',
                                fontSize: '12px',
                                color: '#6B7280'
                            }}>
                                📜 <strong>{clause.indianLawReference.sectionNumber}</strong>: {clause.indianLawReference.summary?.substring(0, 150)}...
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Disclaimer */}
            <div style={{
                marginTop: '40px',
                paddingTop: '20px',
                borderTop: '1px solid #E5E7EB',
                fontSize: '11px',
                color: '#9CA3AF',
                lineHeight: 1.6
            }}>
                <strong>⚖️ Disclaimer:</strong> {results.disclaimer || 'This analysis is for informational purposes only and does not constitute legal advice. Please consult a qualified legal professional for specific legal matters.'}
            </div>

            {/* Footer */}
            <div style={{
                marginTop: '32px',
                textAlign: 'center',
                fontSize: '12px',
                color: '#9CA3AF'
            }}>
                Generated by AndhaKanoon Legal AI • {new Date().getFullYear()}
            </div>
        </div>
    );
}

export default function PrintReportPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
            <ReportContent />
        </Suspense>
    );
}
