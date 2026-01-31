import { auth } from "@clerk/nextjs/server";
import { redirect } from 'next/navigation';
import { getUserRole } from '@/app/actions/user.actions';
import { getUserAnalyses } from '@/app/actions/analysis.actions';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileText, Plus, Search, Filter, AlertTriangle, Shield, Clock, Eye, Trash2, Download } from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import { formatDistanceToNow, format } from 'date-fns';

export default async function DashboardPage() {
    const { userId } = await auth();
    if (!userId) redirect('/');

    // Check if user has a role, if not redirect to onboarding
    const role = await getUserRole();
    if (!role) {
        redirect('/onboarding');
    }

    // Fetch saved analyses from database
    const analyses = await getUserAnalyses();

    const getRiskBadge = (score: number) => {
        if (score >= 70) return { label: 'High Risk', color: 'bg-red-100 text-red-700 border-red-200' };
        if (score >= 40) return { label: 'Medium Risk', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
        return { label: 'Low Risk', color: 'bg-green-100 text-green-700 border-green-200' };
    };

    return (
        <div className="min-h-screen bg-gray-50/50">
            <Navbar />

            <main className="max-w-[1200px] mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-heading font-bold text-gray-900">Your Contracts</h1>
                        <p className="text-gray-500 mt-1">Manage and analyze your legal documents</p>
                    </div>
                    <div className="flex gap-3">
                        <Link href="/">
                            <Button variant="outline" className="gap-2">
                                <FileText className="w-4 h-4" />
                                Upload Contract
                            </Button>
                        </Link>
                        <Link href="/create-contract">
                            <Button className="gap-2">
                                <Plus className="w-4 h-4" />
                                New Contract
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Filters and Search */}
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-6 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search contracts..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                    <Button variant="outline" className="gap-2">
                        <Filter className="w-4 h-4" />
                        Filter
                    </Button>
                </div>

                {/* Empty State */}
                {analyses.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No contracts yet</h3>
                        <p className="text-gray-500 max-w-sm mx-auto mb-6">
                            Create your first AI-drafted contract or upload one for analysis to get started.
                        </p>
                        <div className="flex justify-center gap-4">
                            <Link href="/create-contract">
                                <Button>Draft with AI</Button>
                            </Link>
                            <Link href="/">
                                <Button variant="outline">Upload for Analysis</Button>
                            </Link>
                        </div>
                    </div>
                ) : (
                    /* Table View */
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Document Name</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Risk Score</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Tags</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Analyzed On</th>
                                    <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {analyses.map((analysis) => {
                                    const risk = getRiskBadge(analysis.riskScore);
                                    return (
                                        <tr key={analysis.id} className="hover:bg-gray-50/50 transition-colors">
                                            {/* Document Name */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                        <FileText className="w-5 h-5 text-gray-500" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900 truncate max-w-[250px]">
                                                            {analysis.documentName}
                                                        </p>
                                                        <p className="text-xs text-gray-400">
                                                            {formatDistanceToNow(new Date(analysis.createdAt), { addSuffix: true })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Risk Score */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${analysis.riskScore >= 70 ? 'bg-red-500' :
                                                                    analysis.riskScore >= 40 ? 'bg-yellow-500' : 'bg-green-500'
                                                                }`}
                                                            style={{ width: `${analysis.riskScore}%` }}
                                                        />
                                                    </div>
                                                    <span className={`text-sm font-medium px-2 py-0.5 rounded-full border ${risk.color}`}>
                                                        {analysis.riskScore}/100
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Tags */}
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {analysis.tags.length > 0 ? (
                                                        analysis.tags.slice(0, 3).map(tag => (
                                                            <span
                                                                key={tag}
                                                                className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium"
                                                            >
                                                                {tag}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-gray-400 text-sm">—</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Date */}
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-600">
                                                    {format(new Date(analysis.createdAt), 'MMM d, yyyy')}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link href={`/analysis/${analysis.id}`}>
                                                        <Button variant="ghost" size="sm" className="gap-1.5 text-gray-600 hover:text-primary">
                                                            <Eye className="w-4 h-4" />
                                                            View
                                                        </Button>
                                                    </Link>
                                                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-red-600">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* Table Footer */}
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                            <p className="text-sm text-gray-500">
                                Showing <span className="font-medium text-gray-700">{analyses.length}</span> contract{analyses.length !== 1 ? 's' : ''}
                            </p>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" disabled>Previous</Button>
                                <Button variant="outline" size="sm" disabled>Next</Button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
