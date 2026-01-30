'use client';

import { useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';

interface RiskyClause {
    id: number;
    text: string;
    startIndex: number;
    endIndex: number;
    riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

interface Props {
    contractText: string;
    riskyClauses: RiskyClause[];
    onClauseClick: (clauseId: number) => void;
    highlightedClauseId?: number;
}

const HIGHLIGHT_STYLES = {
    CRITICAL: 'bg-red-100 hover:bg-red-200 border-b-2 border-red-400',
    HIGH: 'bg-orange-100 hover:bg-orange-200 border-b-2 border-orange-400',
    MEDIUM: 'bg-yellow-100 hover:bg-yellow-200 border-b-2 border-yellow-400',
    LOW: 'bg-blue-100 hover:bg-blue-200 border-b-2 border-blue-400'
};

export default function ContractViewer({ contractText, riskyClauses, onClauseClick, highlightedClauseId }: Props) {
    const viewerRef = useRef<HTMLDivElement>(null);
    const clauseRefs = useRef<{ [key: number]: HTMLElement }>({});

    useEffect(() => {
        if (highlightedClauseId !== undefined && clauseRefs.current[highlightedClauseId]) {
            clauseRefs.current[highlightedClauseId].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [highlightedClauseId]);

    const renderAnnotatedText = () => {
        if (!contractText) {
            return <p className="text-neutral-400 italic">No contract text available</p>;
        }

        if (!riskyClauses || riskyClauses.length === 0) {
            return <div className="whitespace-pre-wrap text-neutral-800 leading-relaxed">{contractText}</div>;
        }

        let lastIndex = 0;
        const parts: JSX.Element[] = [];
        const sortedClauses = [...riskyClauses]
            .filter(c => c.startIndex >= 0 && c.endIndex > c.startIndex)
            .sort((a, b) => a.startIndex - b.startIndex);

        sortedClauses.forEach((clause, idx) => {
            if (clause.startIndex > lastIndex) {
                parts.push(
                    <span key={`text-${idx}`} className="whitespace-pre-wrap">
                        {contractText.substring(lastIndex, clause.startIndex)}
                    </span>
                );
            }
            if (clause.startIndex < lastIndex) return;

            const isHighlighted = highlightedClauseId === clause.id;
            parts.push(
                <span
                    key={`clause-${clause.id}`}
                    ref={(el) => { if (el) clauseRefs.current[clause.id] = el; }}
                    className={`
            ${HIGHLIGHT_STYLES[clause.riskLevel]}
            cursor-pointer transition-all duration-200 rounded px-0.5
            ${isHighlighted ? 'ring-2 ring-neutral-900 ring-offset-1 scale-[1.01]' : ''}
          `}
                    onClick={() => onClauseClick(clause.id)}
                    title="Click to view analysis"
                >
                    {contractText.substring(clause.startIndex, clause.endIndex)}
                </span>
            );
            lastIndex = clause.endIndex;
        });

        if (lastIndex < contractText.length) {
            parts.push(
                <span key="text-end" className="whitespace-pre-wrap">
                    {contractText.substring(lastIndex)}
                </span>
            );
        }

        return parts;
    };

    const wordCount = contractText.split(/\s+/).filter(w => w.length > 0).length;

    return (
        <div ref={viewerRef} className="h-full overflow-auto bg-white">
            {/* Header */}
            <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-neutral-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-base font-semibold text-neutral-900">Contract Document</h1>
                        <p className="text-sm text-neutral-500 mt-0.5">
                            {wordCount.toLocaleString()} words
                            {riskyClauses.length > 0 && (
                                <span className="ml-2 text-orange-600">• {riskyClauses.length} issues highlighted</span>
                            )}
                        </p>
                    </div>
                    {riskyClauses.length > 0 && (
                        <div className="hidden md:flex items-center gap-2">
                            <span className="flex items-center gap-1.5 text-xs">
                                <span className="w-3 h-2 rounded-sm bg-red-100 border border-red-300" /> Critical
                            </span>
                            <span className="flex items-center gap-1.5 text-xs">
                                <span className="w-3 h-2 rounded-sm bg-orange-100 border border-orange-300" /> High
                            </span>
                            <span className="flex items-center gap-1.5 text-xs">
                                <span className="w-3 h-2 rounded-sm bg-yellow-100 border border-yellow-300" /> Medium
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Contract Text */}
            <div className="px-6 py-6">
                <div className="text-[15px] text-neutral-800 leading-[1.85] max-w-3xl">
                    {renderAnnotatedText()}
                </div>
            </div>
        </div>
    );
}
