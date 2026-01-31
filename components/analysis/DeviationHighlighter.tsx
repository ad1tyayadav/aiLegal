'use client';

import { TrendingUp, Scale, BookOpen } from 'lucide-react';

interface Deviation {
    category: string;
    foundInContract: string;
    fairStandard: string;
    deviationLevel: 'EXTREME' | 'SIGNIFICANT' | 'MINOR';
    explanation: string;
    legalReference?: string;
    aiSummary?: string;
    matchedText?: string;
}

interface Props {
    deviations: Deviation[];
}

export default function DeviationHighlighter({ deviations }: Props) {
    if (deviations.length === 0) {
        return null;
    }

    const getBadgeColor = (level: string) => {
        switch (level) {
            case 'EXTREME':
                return 'bg-red-100 text-red-800 border-red-300';
            case 'SIGNIFICANT':
                return 'bg-orange-100 text-orange-800 border-orange-300';
            case 'MINOR':
                return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    const getDeviationIcon = (level: string) => {
        switch (level) {
            case 'EXTREME':
                return '🚨';
            case 'SIGNIFICANT':
                return '⚠️';
            case 'MINOR':
                return '💡';
            default:
                return '📋';
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
                <Scale className="h-6 w-6 text-orange-600" />
                <h2 className="text-2xl font-semibold">
                    Deviations from Fair Contract Standards
                </h2>
                <span className="ml-auto bg-orange-100 text-orange-800 text-sm font-medium px-3 py-1 rounded-full">
                    {deviations.length} found
                </span>
            </div>

            <p className="text-gray-600 mb-6">
                Based on the <strong>Indian Contract Act, 1872</strong> and industry standards, your contract differs from fair practices in the following ways:
            </p>

            <div className="space-y-4">
                {deviations.map((deviation, index) => (
                    <div
                        key={index}
                        className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                        <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">{getDeviationIcon(deviation.deviationLevel)}</span>
                                <h3 className="font-semibold text-gray-900">{deviation.category}</h3>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getBadgeColor(deviation.deviationLevel)}`}>
                                {deviation.deviationLevel}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-3">
                            <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                                <p className="text-xs text-red-600 uppercase tracking-wide mb-1 font-medium">
                                    Found in Your Contract
                                </p>
                                <p className="text-red-700 font-medium">{deviation.foundInContract}</p>
                            </div>
                            <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                                <p className="text-xs text-green-600 uppercase tracking-wide mb-1 font-medium">
                                    Fair Standard
                                </p>
                                <p className="text-green-700 font-medium">{deviation.fairStandard}</p>
                            </div>
                        </div>

                        {/* Actual text from contract (if available) */}
                        {deviation.matchedText && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                                <p className="text-xs text-amber-700 uppercase tracking-wide mb-1 font-medium flex items-center gap-1">
                                    📄 Actual Clause from Your Contract
                                </p>
                                <p className="text-amber-900 text-sm italic">"{deviation.matchedText}"</p>
                            </div>
                        )}

                        {/* AI-Generated Summary (if available) */}
                        {deviation.aiSummary && (
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-3">
                                <div className="flex items-center gap-1 mb-1">
                                    <span className="text-sm">🤖</span>
                                    <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">
                                        AI Analysis
                                    </p>
                                </div>
                                <p className="text-blue-800 text-sm">{deviation.aiSummary}</p>
                            </div>
                        )}

                        {/* Static explanation (fallback or additional) */}
                        {!deviation.aiSummary && (
                            <p className="text-gray-700 text-sm mb-2">{deviation.explanation}</p>
                        )}

                        {/* Legal Reference */}
                        {deviation.legalReference && (
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                                <BookOpen className="h-4 w-4 text-gray-400" />
                                <p className="text-xs text-gray-500">
                                    <span className="font-medium">Legal Reference:</span> Indian Contract Act, 1872 - {deviation.legalReference}
                                </p>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800">
                    💡 <strong>Tip:</strong> These deviations don't necessarily violate Indian law, but they are
                    significantly less favorable to you than standard industry practices. Consider negotiating these terms.
                </p>
            </div>
        </div>
    );
}
