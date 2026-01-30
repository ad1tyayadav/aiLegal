'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import SplitScreenLayout from '@/components/layout/SplitScreenLayout';
import ContractViewer from '@/components/contract/ContractViewer';
import AnalysisPanel from '@/components/analysis/AnalysisPanel';

const STORAGE_KEY = 'andhakanoon_analysis_result';

interface AnalysisResult {
    success: boolean;
    processingTimeMs: number;
    document: {
        fileName: string;
        fileSize: number;
        fileType: string;
        extractedCharacters: number;
        pageCount?: number;
        extractedText: string;
    };
    analysis: {
        overallRiskScore: number;
        riskLevel: string;
        totalClauses: number;
        riskyClausesFound: number;
        deviationsFromFairContract: number;
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

export default function ResultPage() {
    const router = useRouter();
    const [results, setResults] = useState<AnalysisResult | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [highlightedClauseId, setHighlightedClauseId] = useState<number | undefined>();
    const [highlightedViolationId, setHighlightedViolationId] = useState<number | undefined>();

    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                setResults(JSON.parse(saved));
            } else {
                router.push('/');
            }
        } catch (err) {
            router.push('/');
        } finally {
            setIsLoading(false);
        }
    }, [router]);

    const handleClauseClick = (clauseId: number) => {
        setHighlightedViolationId(clauseId);
        setTimeout(() => setHighlightedViolationId(undefined), 2000);
    };

    const handleJumpToClause = (clauseId: number) => {
        setHighlightedClauseId(clauseId);
        setTimeout(() => setHighlightedClauseId(undefined), 2000);
    };

    const handleNewAnalysis = () => {
        try { localStorage.removeItem(STORAGE_KEY); } catch (err) { }
        router.push('/');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-50">
                <div className="w-8 h-8 rounded-full border-2 border-neutral-200 border-t-neutral-900 animate-spin"></div>
            </div>
        );
    }

    if (!results) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-50">
                <div className="text-center space-y-4">
                    <p className="text-neutral-600">No analysis results found</p>
                    <Button onClick={() => router.push('/')}>Go to Home</Button>
                </div>
            </div>
        );
    }

    const getRiskVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
        if (score >= 70) return "destructive";
        if (score >= 40) return "default";
        return "secondary";
    };

    return (
        <div className="h-screen flex flex-col bg-neutral-50">
            {/* Header */}
            <header className="flex-shrink-0 bg-white border-b border-neutral-200">
                <div className="px-6 h-14 flex items-center justify-between">
                    {/* Left: Logo & File Info */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-neutral-900 flex items-center justify-center">
                                <span className="text-white font-bold text-xs">अ</span>
                            </div>
                            <Separator orientation="vertical" className="h-6 mx-2" />
                            <div>
                                <h1 className="text-sm font-medium text-neutral-900 truncate max-w-[200px]">
                                    {results.document.fileName}
                                </h1>
                                <p className="text-xs text-neutral-500">
                                    {results.analysis.totalClauses} clauses • {results.processingTimeMs}ms
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Center: Risk Score & Breakdown */}
                    <div className="hidden lg:flex items-center gap-4">
                        <Badge variant={getRiskVariant(results.analysis.overallRiskScore)} className="px-3 py-1">
                            Risk Score: {results.analysis.overallRiskScore}/100
                        </Badge>
                        <Separator orientation="vertical" className="h-6" />
                        <div className="flex items-center gap-3 text-xs">
                            {results.analysis.breakdown.CRITICAL > 0 && (
                                <span className="flex items-center gap-1.5 text-red-600">
                                    <span className="w-2 h-2 rounded-full bg-red-500" />
                                    {results.analysis.breakdown.CRITICAL} Critical
                                </span>
                            )}
                            {results.analysis.breakdown.HIGH > 0 && (
                                <span className="flex items-center gap-1.5 text-orange-600">
                                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                                    {results.analysis.breakdown.HIGH} High
                                </span>
                            )}
                            {results.analysis.breakdown.MEDIUM > 0 && (
                                <span className="flex items-center gap-1.5 text-yellow-600">
                                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                                    {results.analysis.breakdown.MEDIUM} Medium
                                </span>
                            )}
                            {results.analysis.breakdown.LOW > 0 && (
                                <span className="flex items-center gap-1.5 text-blue-600">
                                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                                    {results.analysis.breakdown.LOW} Low
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Right: New Analysis */}
                    <Button size="sm" onClick={handleNewAnalysis}>
                        New Analysis
                    </Button>
                </div>
            </header>

            {/* Split Layout */}
            <div className="flex-1 overflow-hidden">
                <SplitScreenLayout
                    leftPanel={
                        <ContractViewer
                            contractText={results.document.extractedText}
                            riskyClauses={results.riskyClauses.map((v) => ({
                                id: v.clauseNumber,
                                text: v.originalText,
                                startIndex: v.startIndex,
                                endIndex: v.endIndex,
                                riskLevel: v.riskLevel
                            }))}
                            onClauseClick={handleClauseClick}
                            highlightedClauseId={highlightedClauseId}
                        />
                    }
                    rightPanel={
                        <AnalysisPanel
                            overallScore={results.analysis.overallRiskScore}
                            riskLevel={results.analysis.riskLevel}
                            breakdown={results.analysis.breakdown}
                            violations={results.riskyClauses}
                            deviations={results.deviations}
                            onJumpToClause={handleJumpToClause}
                            highlightedViolationId={highlightedViolationId}
                        />
                    }
                />
            </div>
        </div>
    );
}
