'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, FileText, Sparkles, Download, Save, Plus, ChevronRight, Wand2 } from 'lucide-react';

interface Template {
    id: string;
    title: string;
    description: string;
    category: string;
}

interface ClauseItem {
    id: number;
    category: string;
    title: string;
    text: string;
    description: string;
}

export default function CreateContractPage() {
    // State
    const [prompt, setPrompt] = useState('');
    const [content, setContent] = useState('');
    const [title, setTitle] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [clauses, setClauses] = useState<ClauseItem[]>([]);
    const [clauseCategories, setClauseCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Fetch templates and clauses on mount
    useEffect(() => {
        fetchTemplates();
        fetchClauses();
    }, []);

    const fetchTemplates = async () => {
        try {
            const res = await fetch('/api/contracts?type=templates');
            const data = await res.json();
            if (data.success) {
                setTemplates(data.templates);
            }
        } catch (err) {
            console.error('Failed to fetch templates:', err);
        }
    };

    const fetchClauses = async () => {
        try {
            const res = await fetch('/api/contracts?type=clauses');
            const data = await res.json();
            if (data.success) {
                setClauses(data.clauses);
                setClauseCategories(data.categories);
            }
        } catch (err) {
            console.error('Failed to fetch clauses:', err);
        }
    };

    const handleGenerate = async (templateId?: string) => {
        if (!prompt.trim() && !templateId) {
            setError('Please enter a prompt or select a template');
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const res = await fetch('/api/generate-contract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: prompt || 'Generate a contract', templateId })
            });

            const data = await res.json();

            if (data.success) {
                setTitle(data.title);
                setContent(data.content);

                if (data.isFallback) {
                    const fallbackName = data.title.includes('Draft') ? 'basic' : data.title;
                    setError(`AI is busy (${data.error?.includes('429') ? 'Rate Limit' : 'Error'}). Switched to "${fallbackName}" template.`);
                } else {
                    setSuccess('Contract generated successfully!');
                    setTimeout(() => setSuccess(null), 3000);
                }
            } else {
                setError(data.error || 'Failed to generate contract');
            }
        } catch (err) {
            setError('Failed to generate contract');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAddClause = async (clause: ClauseItem) => {
        if (!content) {
            // No existing content, just add the clause
            setContent(prev => prev + '\n\n## ' + clause.title + '\n\n' + clause.text);
            return;
        }

        // Enhance existing contract with the clause using AI
        setIsGenerating(true);
        try {
            const res = await fetch('/api/generate-contract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'enhance',
                    existingContent: content,
                    clauseText: clause.text
                })
            });

            const data = await res.json();
            if (data.success) {
                setContent(data.content);
            } else {
                // Fallback: just append
                setContent(prev => prev + '\n\n## ' + clause.title + '\n\n' + clause.text);
            }
        } catch (err) {
            // Fallback: just append
            setContent(prev => prev + '\n\n## ' + clause.title + '\n\n' + clause.text);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveDraft = async () => {
        if (!content) {
            setError('Nothing to save');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const res = await fetch('/api/contracts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title || 'Untitled Contract',
                    content,
                    status: 'draft'
                })
            });

            const data = await res.json();

            if (data.success) {
                setSuccess('Draft saved successfully!');
                setTimeout(() => setSuccess(null), 3000);
            } else {
                setError(data.error || 'Failed to save draft');
            }
        } catch (err) {
            setError('Failed to save draft');
        } finally {
            setIsSaving(false);
        }
    };

    const handleExportPDF = async () => {
        if (!content) {
            setError('Nothing to export');
            return;
        }

        setIsExporting(true);
        setError(null);

        try {
            const res = await fetch('/api/export-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content,
                    isDraft: true,
                    filename: `${title || 'contract'}_draft.pdf`
                })
            });

            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${title || 'contract'}_draft.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
                setSuccess('PDF exported successfully!');
                setTimeout(() => setSuccess(null), 3000);
            } else {
                setError('Failed to export PDF');
            }
        } catch (err) {
            setError('Failed to export PDF');
        } finally {
            setIsExporting(false);
        }
    };

    const filteredClauses = selectedCategory
        ? clauses.filter(c => c.category === selectedCategory)
        : clauses;

    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            <Navbar />

            <main className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-heading font-bold text-foreground mb-2">
                        Create Contract
                    </h1>
                    <p className="text-muted-foreground">
                        Generate professional contracts with AI assistance
                    </p>
                </div>

                {/* Notifications */}
                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
                        {success}
                    </div>
                )}

                {/* Main Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Sidebar - Templates & Clauses */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Templates */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-primary" />
                                    Templates
                                </CardTitle>
                                <CardDescription>Start with a template</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {templates.map(template => (
                                    <button
                                        key={template.id}
                                        onClick={() => handleGenerate(template.id)}
                                        disabled={isGenerating}
                                        className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 hover:border-primary/50 transition-colors group"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-sm">{template.title}</span>
                                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                                    </button>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Clause Library */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Plus className="w-5 h-5 text-primary" />
                                    Clause Library
                                </CardTitle>
                                <CardDescription>Add standard clauses</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {/* Category Filter */}
                                <div className="flex flex-wrap gap-1 mb-3">
                                    <button
                                        onClick={() => setSelectedCategory(null)}
                                        className={`px-2 py-1 text-xs rounded-full transition-colors ${!selectedCategory
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                            }`}
                                    >
                                        All
                                    </button>
                                    {clauseCategories.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setSelectedCategory(cat)}
                                            className={`px-2 py-1 text-xs rounded-full transition-colors ${selectedCategory === cat
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                                }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>

                                {/* Clauses List */}
                                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                    {filteredClauses.map(clause => (
                                        <button
                                            key={clause.id}
                                            onClick={() => handleAddClause(clause)}
                                            disabled={isGenerating}
                                            className="w-full text-left p-2 rounded-lg border border-border hover:bg-muted/50 hover:border-primary/50 transition-colors"
                                        >
                                            <span className="font-medium text-sm">{clause.title}</span>
                                            <p className="text-xs text-muted-foreground">{clause.description}</p>
                                        </button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Center - Editor */}
                    <div className="lg:col-span-5 space-y-4">
                        {/* Prompt Input */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Wand2 className="w-5 h-5 text-primary" />
                                    AI Prompt
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="Describe the contract you need... e.g., 'Draft a freelance web development agreement for a 3-month project'"
                                    className="w-full h-24 p-3 border border-border rounded-lg bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                                <Button
                                    onClick={() => handleGenerate()}
                                    disabled={isGenerating || !prompt.trim()}
                                    className="w-full mt-3"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4 mr-2" />
                                            Generate Contract
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Contract Editor */}
                        <Card className="flex-1">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">Contract Editor</CardTitle>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleSaveDraft}
                                            disabled={isSaving || !content}
                                        >
                                            {isSaving ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Save className="w-4 h-4" />
                                            )}
                                            <span className="ml-2 hidden sm:inline">Save Draft</span>
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={handleExportPDF}
                                            disabled={isExporting || !content}
                                        >
                                            {isExporting ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Download className="w-4 h-4" />
                                            )}
                                            <span className="ml-2 hidden sm:inline">Export PDF</span>
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Contract Title"
                                    className="w-full p-2 mb-3 border border-border rounded-lg bg-background font-heading font-bold text-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Your contract content will appear here..."
                                    className="w-full h-[400px] p-3 border border-border rounded-lg bg-background resize-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right - Live Preview */}
                    <div className="lg:col-span-4">
                        <Card className="h-full">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg">Live Preview</CardTitle>
                                <CardDescription>How your contract will look</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="relative bg-white border border-border rounded-lg p-6 min-h-[500px] shadow-inner overflow-auto">
                                    {/* Draft Watermark */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <span className="text-8xl font-bold text-gray-100 rotate-[-30deg] select-none">
                                            DRAFT
                                        </span>
                                    </div>

                                    {/* Content Preview */}
                                    <div className="relative z-10 prose prose-sm max-w-none">
                                        {content ? (
                                            <div
                                                dangerouslySetInnerHTML={{
                                                    __html: content
                                                        .replace(/^# (.*)$/gm, '<h1 class="text-xl font-bold mb-4">$1</h1>')
                                                        .replace(/^## (.*)$/gm, '<h2 class="text-lg font-semibold mt-6 mb-2 text-primary">$1</h2>')
                                                        .replace(/^### (.*)$/gm, '<h3 class="text-md font-medium mt-4 mb-2">$1</h3>')
                                                        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                                                        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
                                                        .replace(/^- (.*)$/gm, '<li>$1</li>')
                                                        .replace(/^---$/gm, '<hr class="my-4 border-gray-200"/>')
                                                        .replace(/\n\n/g, '</p><p class="my-2">')
                                                        .replace(/\n/g, '<br/>')
                                                }}
                                            />
                                        ) : (
                                            <div className="text-center text-muted-foreground py-20">
                                                <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                                <p>Your contract preview will appear here</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
