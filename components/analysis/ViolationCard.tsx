'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface ViolationProps {
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

type UserRole = 'freelancer' | 'company';

interface Props {
    violation: ViolationProps;
    onJumpToClause: () => void;
    isHighlighted?: boolean;
    selectedRole?: UserRole;
}

export default function ViolationCard({ violation, onJumpToClause, isHighlighted, selectedRole = 'freelancer' }: Props) {
    const [expanded, setExpanded] = useState(false);
    const [localRole, setLocalRole] = useState<UserRole>(selectedRole);

    // Get explanation based on selected role
    const currentExplanation = violation.explanation[localRole];

    const getBadgeVariant = (): "default" | "secondary" | "destructive" | "outline" => {
        switch (violation.riskLevel) {
            case 'CRITICAL': return 'destructive';
            case 'HIGH': return 'default';
            default: return 'secondary';
        }
    };

    const getBorderColor = () => {
        switch (violation.riskLevel) {
            case 'CRITICAL': return 'border-l-red-500';
            case 'HIGH': return 'border-l-orange-500';
            case 'MEDIUM': return 'border-l-yellow-500';
            case 'LOW': return 'border-l-blue-500';
        }
    };

    return (
        <Card className={`
      border-l-4 ${getBorderColor()}
      ${isHighlighted ? 'ring-2 ring-neutral-900 ring-offset-2' : ''}
      transition-all hover:shadow-md
    `}>
            <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-neutral-900">Clause {violation.clauseNumber}</h3>
                            <Badge variant={getBadgeVariant()} className="text-xs">{violation.riskLevel}</Badge>
                        </div>
                        <p className="text-sm text-neutral-500 capitalize">{violation.violationType.replace(/_/g, ' ')}</p>
                    </div>
                </div>

                {/* Role Toggle */}
                <div className="flex gap-1 mb-3 p-1 bg-neutral-100 rounded-lg w-fit">
                    <button
                        onClick={() => setLocalRole('freelancer')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${localRole === 'freelancer'
                                ? 'bg-white text-neutral-900 shadow-sm'
                                : 'text-neutral-600 hover:text-neutral-900'
                            }`}
                    >
                        👤 Freelancer View
                    </button>
                    <button
                        onClick={() => setLocalRole('company')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${localRole === 'company'
                                ? 'bg-white text-neutral-900 shadow-sm'
                                : 'text-neutral-600 hover:text-neutral-900'
                            }`}
                    >
                        🏢 Company View
                    </button>
                </div>

                {/* Impact Tags */}
                {(violation.businessRisk || (violation.appliesTo && violation.appliesTo.length > 0)) && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                        {violation.businessRisk && (
                            <Badge variant="outline" className="text-xs border-red-200 text-red-700 bg-red-50">
                                {violation.businessRisk}
                            </Badge>
                        )}
                        {violation.appliesTo?.map((role, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                                {role}
                            </Badge>
                        ))}
                    </div>
                )}

                {/* Law Reference */}
                <div className="bg-neutral-50 rounded-lg p-3 mb-3 border">
                    <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Legal Reference</p>
                    <p className="text-sm font-medium text-neutral-900">{violation.indianLawReference.section}</p>
                    <p className="text-sm text-neutral-600">{violation.indianLawReference.title}</p>
                </div>

                {/* Explanation - Role Based */}
                <p className="text-sm text-neutral-600 leading-relaxed">
                    {currentExplanation?.simple || violation.indianLawReference.summary}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-3 mt-4 pt-3 border-t">
                    <Button variant="ghost" size="sm" onClick={onJumpToClause} className="text-xs">
                        View in document →
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="text-xs text-neutral-500">
                        {expanded ? 'Less' : 'More'} details
                    </Button>
                </div>

                {/* Expanded Content */}
                {expanded && (
                    <div className="mt-4 pt-4 space-y-4 border-t bg-neutral-50 -mx-4 px-4 pb-4 -mb-4 rounded-b-lg">
                        {currentExplanation?.realLifeImpact && (
                            <div>
                                <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">
                                    Real-World Impact ({localRole === 'freelancer' ? 'For You' : 'For Business'})
                                </p>
                                <p className="text-sm text-neutral-600">{currentExplanation.realLifeImpact}</p>
                            </div>
                        )}
                        <div>
                            <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Original Clause</p>
                            <p className="text-sm text-neutral-600 italic bg-white p-3 rounded border">
                                "{violation.originalText}"
                            </p>
                        </div>
                        <a
                            href={violation.indianLawReference.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-neutral-900 font-medium hover:underline"
                        >
                            View on IndiaCode
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
