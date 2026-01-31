'use client';

import { useState } from 'react';
import { AlertTriangle, AlertCircle, Info, ExternalLink } from 'lucide-react';

type UserRole = 'freelancer' | 'company';

interface Props {
    clause: {
        clauseNumber: number;
        originalText: string;
        violationType: string;
        riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
        riskScore: number;
        indianLawReference: {
            section: string;
            title: string;
            fullText: string;
            summary: string;
            url: string;
        };
        explanation: {
            freelancer: { simple: string; realLifeImpact: string; };
            company: { simple: string; realLifeImpact: string; };
            generatedBy?: string;
        };
        matchedKeywords: string[];
    };
}

export default function RiskyClauseCard({ clause }: Props) {
    const [role, setRole] = useState<UserRole>('freelancer');
    const currentExplanation = clause.explanation[role];

    const getBadgeColor = () => {
        switch (clause.riskLevel) {
            case 'CRITICAL':
                return 'bg-red-100 text-red-800 border-red-300';
            case 'HIGH':
                return 'bg-orange-100 text-orange-800 border-orange-300';
            case 'MEDIUM':
                return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'LOW':
                return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    const getIcon = () => {
        switch (clause.riskLevel) {
            case 'CRITICAL':
                return <AlertTriangle className="h-5 w-5 text-red-600" />;
            case 'HIGH':
                return <AlertCircle className="h-5 w-5 text-orange-600" />;
            default:
                return <Info className="h-5 w-5 text-yellow-600" />;
        }
    };

    return (
        <div className="border rounded-lg p-6 bg-white shadow-sm">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                    {getIcon()}
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getBadgeColor()}`}>
                        {clause.riskLevel} RISK (+{clause.riskScore} points)
                    </span>
                </div>
                <span className="text-sm text-gray-500">Clause #{clause.clauseNumber}</span>
            </div>

            {/* Role Toggle */}
            <div className="flex gap-1 mb-4 p-1 bg-gray-100 rounded-lg w-fit">
                <button
                    onClick={() => setRole('freelancer')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${role === 'freelancer'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                >
                    👤 Freelancer View
                </button>
                <button
                    onClick={() => setRole('company')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${role === 'company'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                >
                    🏢 Company View
                </button>
            </div>

            {/* Original Clause Text */}
            <div className="mb-4">
                <h4 className="font-semibold text-gray-900 mb-2">Original Clause:</h4>
                <div className="bg-gray-50 p-4 rounded border border-gray-200">
                    <p className="text-gray-700 text-sm italic">&quot;{clause.originalText.substring(0, 300)}...&quot;</p>
                </div>
            </div>

            {/* Simple Explanation - Role Based */}
            <div className="mb-4">
                <h4 className="font-semibold text-gray-900 mb-2">📝 What This Means ({role === 'freelancer' ? 'For You' : 'For Business'}):</h4>
                <p className="text-gray-700">{currentExplanation?.simple}</p>
            </div>

            {/* Real-Life Impact - Role Based */}
            <div className="mb-4">
                <h4 className="font-semibold text-gray-900 mb-2">⚡ Real-Life Impact:</h4>
                <p className="text-gray-700">{currentExplanation?.realLifeImpact}</p>
            </div>

            {/* Indian Law Reference */}
            <div className="bg-indigo-50 p-4 rounded border border-indigo-200">
                <h4 className="font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                    ⚖️ Under Indian Law: {clause.indianLawReference.section}
                </h4>
                <p className="text-indigo-800 text-sm mb-2">{clause.indianLawReference.title}</p>
                <p className="text-indigo-700 text-sm mb-3">{clause.indianLawReference.summary}</p>
                <a
                    href={clause.indianLawReference.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1"
                >
                    View Official Indian Contract Act PDF
                    <ExternalLink className="h-3 w-3" />
                </a>
            </div>

            {/* Matched Keywords (for transparency) */}
            <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                    <strong>Detected keywords:</strong> {clause.matchedKeywords.join(', ')}
                </p>
            </div>
        </div>
    );
}
