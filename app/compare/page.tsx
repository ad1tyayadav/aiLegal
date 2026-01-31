import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload, GitCompare, FileText } from 'lucide-react';
import Navbar from '@/components/landing/Navbar';

export default function ComparePage() {
    return (
        <div className="min-h-screen bg-gray-50/50">
            <Navbar />

            <main className="max-w-[1200px] mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/dashboard" className="inline-flex items-center text-sm text-gray-500 hover:text-primary mb-4">
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-heading font-bold text-gray-900">Compare Contracts</h1>
                    <p className="text-gray-500 mt-1">Analyze difference and risks between two documents side-by-side.</p>
                </div>

                {/* Comparison Selector */}
                <div className="grid md:grid-cols-2 gap-8 mb-8">
                    {/* Contract A */}
                    <div className="bg-white p-8 rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center text-center min-h-[300px]">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                            <FileText className="w-8 h-8 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Contract A</h3>
                        <p className="text-sm text-gray-500 mb-6">Select a contract from your dashboard or upload new</p>
                        <div className="flex gap-2">
                            <Button variant="outline" className="gap-2">
                                Select Existing
                            </Button>
                            <Button className="gap-2">
                                <Upload className="w-4 h-4" />
                                Upload
                            </Button>
                        </div>
                    </div>

                    {/* Contract B */}
                    <div className="bg-white p-8 rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center text-center min-h-[300px]">
                        <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mb-4">
                            <FileText className="w-8 h-8 text-purple-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Contract B</h3>
                        <p className="text-sm text-gray-500 mb-6">Select a contract to compare against</p>
                        <div className="flex gap-2">
                            <Button variant="outline" className="gap-2">
                                Select Existing
                            </Button>
                            <Button className="gap-2">
                                <Upload className="w-4 h-4" />
                                Upload
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Action */}
                <div className="flex justify-center">
                    <Button size="lg" className="w-full md:w-auto min-w-[200px] h-12 text-lg gap-2" disabled>
                        <GitCompare className="w-5 h-5" />
                        Run Comparison Analysis
                    </Button>
                </div>

                <p className="text-center text-sm text-gray-400 mt-4">
                    Select two contracts above to enable comparison
                </p>

            </main>
        </div>
    );
}
