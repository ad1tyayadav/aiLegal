'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import Footer from '@/components/landing/Footer';
import { Loader2 } from 'lucide-react';

const STORAGE_KEY = 'andhakanoon_analysis_result';

export default function Home() {
  const router = useRouter();
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (file: File, language: 'en' | 'hi') => {
    setAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('language', language);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Analysis failed');
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      router.push('/result');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setAnalyzing(false);
    }
  };

  if (analyzing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl opacity-50 animate-pulse" />
        </div>

        <div className="text-center space-y-8 relative z-10 max-w-md w-full">
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-muted"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl font-heading font-bold text-foreground">Analyzing Contracts</h2>
            <div className="flex flex-col gap-1 items-center">
              <p className="text-muted-foreground animate-pulse">Running legal checks...</p>
              <p className="text-xs text-muted-foreground/60">This may take up to a minute</p>
            </div>
          </div>

          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-primary animate-[progress_2s_ease-in-out_infinite] w-1/3 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-secondary/30">
      <Navbar />
      <main>
        <Hero
          onUpload={handleFileUpload}
          error={error}
          setError={setError}
        />
        <Features />
      </main>
      <Footer />
    </div>
  );
}
