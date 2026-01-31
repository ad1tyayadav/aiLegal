'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { FileText, PenLine } from 'lucide-react';
import ContractUploader from '@/components/upload/ContractUploader';
import { SignedIn, SignedOut, SignUpButton } from "@clerk/nextjs";

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

                {/* Content Stack: Centered */}
                <div className="flex flex-col items-center text-center max-w-4xl mx-auto">

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
                    <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mb-10 mx-auto">
                        Don't let complex legal jargon trap you. Upload your contract and get an instant, easy-to-understand analysis based on Indian Law.
                    </p>

                    {/* 4. Upload Card - Centered */}
                    <div className="w-full max-w-[600px] mx-auto">
                        <div className="bg-white/70 backdrop-blur-xl border border-border/60 shadow-xl rounded-2xl p-6 md:p-8 text-left">
                            <div className="mb-6 text-center">
                                <h3 className="text-xl font-heading font-bold text-foreground">Upload Document</h3>
                                <p className="text-sm text-muted-foreground">Supported formats: PDF, DOCX, TXT</p>
                            </div>

                            <ContractUploader onUpload={onUpload} />

                            {error && (
                                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-left">
                                    <p className="text-sm font-medium text-destructive">{error}</p>
                                    <button onClick={() => setError(null)} className="text-xs text-destructive/80 hover:underline mt-1">
                                        Dismiss
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Divider with "or" */}
                        <div className="flex items-center gap-4 my-6">
                            <div className="flex-1 h-px bg-border/60"></div>
                            <span className="text-sm text-muted-foreground font-medium">or</span>
                            <div className="flex-1 h-px bg-border/60"></div>
                        </div>

                        {/* Create Contract Button */}
                        <div className="flex flex-col gap-4 w-full">
                            {/* Sign Up / Get Started Button */}
                            <SignedOut>
                                <SignUpButton mode="modal">
                                    <button className="group flex items-center justify-center gap-3 w-full px-6 py-4 bg-primary text-primary-foreground rounded-xl font-semibold shadow-lg hover:shadow-xl hover:bg-primary/90 transition-all duration-200">
                                        <PenLine className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                        <span>Start Free Analysis</span>
                                        <span className="text-xs px-2 py-0.5 bg-white/20 rounded-full">Sign Up</span>
                                    </button>
                                </SignUpButton>
                            </SignedOut>

                            <SignedIn>
                                <Link
                                    href="/dashboard"
                                    className="group flex items-center justify-center gap-3 w-full px-6 py-4 bg-primary text-primary-foreground rounded-xl font-semibold shadow-lg hover:shadow-xl hover:bg-primary/90 transition-all duration-200"
                                >
                                    <PenLine className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    <span>Go into Dashboard</span>
                                </Link>
                            </SignedIn>
                        </div>
                        <p className="text-center text-xs text-muted-foreground mt-2">
                            Generate professional contracts with AI assistance
                        </p>
                    </div>

                    {/* 5. Social Proof / Stats */}
                    <div className="flex items-center justify-center gap-4 mt-8 md:mt-12">
                        <div className="flex -space-x-3">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="w-9 h-9 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                                    U{i}
                                </div>
                            ))}
                        </div>
                        <div className="text-sm leading-tight text-left">
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
