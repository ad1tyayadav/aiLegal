'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header
            className={cn(
                "sticky top-0 z-50 transition-all duration-300 border-b border-transparent",
                scrolled ? "bg-white/80 backdrop-blur-md border-border/50 shadow-sm" : "bg-transparent"
            )}
        >
            <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8 h-20 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-heading font-bold text-xl shadow-lg transition-transform group-hover:scale-105">
                        अ
                    </div>
                    <span className="font-heading font-bold text-xl tracking-tight text-foreground">
                        Andha Kanoon
                    </span>
                </Link>

                <nav className="hidden md:flex items-center gap-6">
                    <SignedIn>
                        <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                            Dashboard
                        </Link>
                        <Link href="/compare" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                            Compare
                        </Link>
                        <Link href="/settings" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                            Settings
                        </Link>
                        <Link href="/create-contract">
                            <Button variant="outline" className="h-9 px-4 font-medium">
                                Create Contract
                            </Button>
                        </Link>
                        <div className="ml-2">
                            <UserButton afterSignOutUrl="/" />
                        </div>
                    </SignedIn>

                    <SignedOut>
                        <Link href="/#features" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                            Features
                        </Link>
                        <Link href="/#pricing" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                            Pricing
                        </Link>
                        <SignInButton mode="modal">
                            <Button className="font-medium px-6">
                                Sign In
                            </Button>
                        </SignInButton>
                    </SignedOut>
                </nav>
            </div>
        </header>
    );
}
