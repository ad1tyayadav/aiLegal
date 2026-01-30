'use client';

import { Badge } from '@/components/ui/badge';
import ContractUploader from '@/components/upload/ContractUploader';

interface HeroProps {
    onUpload: (file: File, language: 'en' | 'hi') => void;
    error: string | null;
    setError: (error: string | null) => void;
}

export default function Hero({ onUpload, error, setError }: HeroProps) {
    return (
        <section className="relative py-12 md:py-20 lg:py-24 overflow-hidden">

            {/* Container: 1200px centered with responsive padding */}
            <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8">

                {/* Content Stack: Strictly Left Aligned */}
                <div className="flex flex-col items-start text-left max-w-4xl">

                    {/* 1. Badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 md:mb-8 rounded-full bg-secondary/20 border border-secondary/40 text-secondary-foreground text-sm font-medium">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400/80 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                        </span>
                        AI-Powered Legal Analysis
                    </div>

                    {/* 2. Heading */}
                    <h1 className="text-4xl md:text-5xl lg:text-7xl font-heading font-bold text-foreground leading-[1.1] tracking-tight mb-6">
                        Understand Your <br />
                        <span className="text-primary relative inline-block">
                            Contracts Better.
                        </span>
                    </h1>

                    {/* 3. Subheading */}
                    <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mb-10">
                        Don't let complex legal jargon trap you. Upload your contract and get an instant, easy-to-understand analysis based on Indian Law.
                    </p>

                    {/* 4. Upload Card - Left Aligned */}
                    <div className="w-full max-w-[600px]">
                        <div className="bg-white/70 backdrop-blur-xl border border-border/60 shadow-xl rounded-2xl p-6 md:p-8">
                            <div className="mb-6">
                                <h3 className="text-xl font-heading font-bold text-foreground">Upload Document</h3>
                                <p className="text-sm text-muted-foreground">Supported formats: PDF, DOCX, TXT</p>
                            </div>

                            <ContractUploader onUpload={onUpload} />

                            {error && (
                                <div className="mt-4 p-3 bg-destuctive/10 border border-destructive/20 rounded-lg text-left">
                                    <p className="text-sm font-medium text-destructive">{error}</p>
                                    <button onClick={() => setError(null)} className="text-xs text-destructive/80 hover:underline mt-1">
                                        Dismiss
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 5. Social Proof / Stats */}
                    <div className="flex items-center gap-4 mt-8 md:mt-12">
                        <div className="flex -space-x-3">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="w-9 h-9 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                                    U{i}
                                </div>
                            ))}
                        </div>
                        <div className="text-sm leading-tight">
                            <span className="font-bold text-foreground block">1,000+ contracts</span>
                            <span className="text-muted-foreground">Trusted by professionals</span>
                        </div>
                    </div>

                </div>
            </div>

            {/* Background Decorative - Positioned to not interfere with text readability */}
            <div className="absolute top-0 right-0 w-[50%] h-full pointer-events-none -z-10 opacity-40 overflow-hidden">
                <div className="absolute top-[10%] right-[-10%] w-[600px] h-[600px] bg-secondary/10 rounded-full blur-[120px]" />
            </div>

        </section>
    );
}
