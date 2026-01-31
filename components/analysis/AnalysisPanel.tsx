'use client';

import { useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import ViolationCard from './ViolationCard';

interface Violation {
    id: number;
    clauseNumber: number;
    originalText: string;
    violationType: string;
    riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    riskScore: number;
    appliesTo?: string[];
    businessRisk?: string;
    indianLawReference: { section: string; title: string; fullText: string; summary: string; url: string; };
    explanation: {
        freelancer: { simple: string; realLifeImpact: string; };
        company: { simple: string; realLifeImpact: string; };
        generatedBy?: string;
    };
}

interface Props {
    overallScore: number;
    riskLevel: string;
    breakdown: { CRITICAL: number; HIGH: number; MEDIUM: number; LOW: number; };
    violations: Violation[];
    deviations: any[];
    onJumpToClause: (clauseId: number) => void;
    highlightedViolationId?: number;
}

export default function AnalysisPanel({ overallScore, riskLevel, breakdown, violations, deviations, onJumpToClause, highlightedViolationId }: Props) {
    const violationRefs = useRef<{ [key: number]: HTMLElement }>({});

    useEffect(() => {
        if (highlightedViolationId !== undefined && violationRefs.current[highlightedViolationId]) {
            violationRefs.current[highlightedViolationId].scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [highlightedViolationId]);

    const totalIssues = violations.length + deviations.length;

    const getScoreColor = () => {
        if (overallScore >= 70) return 'text-red-600';
        if (overallScore >= 40) return 'text-orange-600';
        if (overallScore >= 20) return 'text-yellow-600';
        return 'text-green-600';
    };

    return (
        <div className="p-6 space-y-6 bg-neutral-50 min-h-full">
            {/* Score Card */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-neutral-500 uppercase tracking-wide">Risk Assessment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-baseline gap-2">
                        <span className={`text-4xl font-bold ${getScoreColor()}`}>{overallScore}</span>
                        <span className="text-lg text-neutral-400">/ 100</span>
                    </div>
                    <Progress value={overallScore} className="h-2" />
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {breakdown.CRITICAL > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                <span className="text-sm"><span className="font-medium">{breakdown.CRITICAL}</span> <span className="text-neutral-500">critical</span></span>
                            </div>
                        )}
                        {breakdown.HIGH > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                                <span className="text-sm"><span className="font-medium">{breakdown.HIGH}</span> <span className="text-neutral-500">high</span></span>
                            </div>
                        )}
                        {breakdown.MEDIUM > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                                <span className="text-sm"><span className="font-medium">{breakdown.MEDIUM}</span> <span className="text-neutral-500">medium</span></span>
                            </div>
                        )}
                        {breakdown.LOW > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                <span className="text-sm"><span className="font-medium">{breakdown.LOW}</span> <span className="text-neutral-500">low</span></span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* No Issues */}
            {totalIssues === 0 && (
                <Card>
                    <CardContent className="p-8 text-center">
                        <div className="w-14 h-14 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
                            <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-neutral-900 mb-2">All Clear!</h3>
                        <p className="text-neutral-500 max-w-sm mx-auto">No significant issues found in this contract.</p>
                    </CardContent>
                </Card>
            )}

            {/* Violations */}
            {violations.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">Issues Found</h2>
                        <Badge variant="secondary">{violations.length}</Badge>
                    </div>
                    <div className="space-y-3">
                        {violations.map((violation) => (
                            <div key={violation.clauseNumber} ref={(el) => { if (el) violationRefs.current[violation.clauseNumber] = el; }}>
                                <ViolationCard
                                    violation={violation}
                                    onJumpToClause={() => onJumpToClause(violation.clauseNumber)}
                                    isHighlighted={highlightedViolationId === violation.clauseNumber}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Deviations */}
            {deviations.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">Deviations</h2>
                        <Badge variant="secondary">{deviations.length}</Badge>
                    </div>
                    <div className="space-y-3">
                        {deviations.map((deviation, idx) => (
                            <Card key={idx}>
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <h3 className="font-medium text-neutral-900">{deviation.category}</h3>
                                        <Badge variant={deviation.deviationLevel === 'EXTREME' ? 'destructive' : 'default'}>
                                            {deviation.deviationLevel}
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div className="bg-neutral-50 rounded-lg p-3 border">
                                            <p className="text-xs text-neutral-500 mb-1">Found</p>
                                            <p className="text-sm text-neutral-900">{deviation.foundInContract}</p>
                                        </div>
                                        <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                                            <p className="text-xs text-neutral-500 mb-1">Standard</p>
                                            <p className="text-sm text-neutral-900">{deviation.fairStandard}</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-neutral-600">{deviation.explanation}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Disclaimer */}
            <Separator />
            <p className="text-xs text-neutral-400 leading-relaxed">
                ⚠️ This is an educational tool only and not a substitute for professional legal advice.
            </p>
        </div>
    );
}
