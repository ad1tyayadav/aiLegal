'use client';

interface Props {
    score: number;
    level: string;
    breakdown: { CRITICAL: number; HIGH: number; MEDIUM: number; LOW: number; };
}

export default function RiskScoreMeter({ score, level, breakdown }: Props) {
    const getScoreColor = () => {
        if (score >= 70) return 'text-[#C53030]';
        if (score >= 40) return 'text-[#DD6B20]';
        if (score >= 20) return 'text-[#D69E2E]';
        return 'text-[#38A169]';
    };

    const getBarColor = () => {
        if (score >= 70) return 'bg-[#C53030]';
        if (score >= 40) return 'bg-[#DD6B20]';
        if (score >= 20) return 'bg-[#D69E2E]';
        return 'bg-[#38A169]';
    };

    const getGradient = () => {
        if (score >= 70) return 'from-[#C53030] to-[#E53E3E]';
        if (score >= 40) return 'from-[#DD6B20] to-[#ED8936]';
        if (score >= 20) return 'from-[#D69E2E] to-[#ECC94B]';
        return 'from-[#38A169] to-[#48BB78]';
    };

    return (
        <div className="space-y-6">
            {/* Score Display */}
            <div className="flex items-end gap-2">
                <span className={`text-5xl font-bold tracking-tight ${getScoreColor()}`}>{score}</span>
                <span className="text-xl text-[#8A857E] mb-1.5">/ 100</span>
            </div>

            {/* Progress Bar */}
            <div className="h-3 bg-[#EDE9E3] rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r ${getGradient()}`}
                    style={{ width: `${score}%` }}
                />
            </div>

            {/* Breakdown */}
            <div className="flex flex-wrap gap-x-6 gap-y-2">
                {breakdown.CRITICAL > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#C53030]" />
                        <span className="text-sm">
                            <span className="font-semibold text-[#1A1815]">{breakdown.CRITICAL}</span>
                            <span className="text-[#8A857E] ml-1">critical</span>
                        </span>
                    </div>
                )}
                {breakdown.HIGH > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#DD6B20]" />
                        <span className="text-sm">
                            <span className="font-semibold text-[#1A1815]">{breakdown.HIGH}</span>
                            <span className="text-[#8A857E] ml-1">high</span>
                        </span>
                    </div>
                )}
                {breakdown.MEDIUM > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#D69E2E]" />
                        <span className="text-sm">
                            <span className="font-semibold text-[#1A1815]">{breakdown.MEDIUM}</span>
                            <span className="text-[#8A857E] ml-1">medium</span>
                        </span>
                    </div>
                )}
                {breakdown.LOW > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#3182CE]" />
                        <span className="text-sm">
                            <span className="font-semibold text-[#1A1815]">{breakdown.LOW}</span>
                            <span className="text-[#8A857E] ml-1">low</span>
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
