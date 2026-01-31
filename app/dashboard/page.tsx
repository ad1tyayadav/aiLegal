import { auth } from "@clerk/nextjs/server";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileText, Plus, Search, Filter } from 'lucide-react';
import Navbar from '@/components/landing/Navbar';

export default async function DashboardPage() {
    const { userId } = await auth();

    // Mock data for now (DB fetch will replace this)
    const contracts = [];

    return (
        <div className="min-h-screen bg-gray-50/50">
            <Navbar />

            <main className="max-w-[1200px] mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-heading font-bold text-gray-900">Your Contracts</h1>
                        <p className="text-gray-500 mt-1">Manage and analyze your legal documents</p>
                    </div>
                    <Link href="/create-contract">
                        <Button className="gap-2">
                            <Plus className="w-4 h-4" />
                            New Contract
                        </Button>
                    </Link>
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
                {contracts.length === 0 ? (
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
                    <div className="grid gap-4">
                        {/* List contracts here later */}
                    </div>
                )}
            </main>
        </div>
    );
}
