'use client';

import { useState } from 'react';
import { updateUserRole } from '@/app/actions/user.actions';
import { Button } from '@/components/ui/button';
import { Briefcase, User as UserIcon, CheckCircle2, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@clerk/nextjs';

export default function OnboardingPage() {
    const { user } = useUser();
    const [selectedRole, setSelectedRole] = useState<'freelancer' | 'business' | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleContinue = async () => {
        if (!selectedRole) return;
        setIsSubmitting(true);
        try {
            await updateUserRole(selectedRole);
        } catch (error) {
            console.error("Failed to update role:", error);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-heading font-bold text-gray-900 mb-3">
                        Welcome, {user?.firstName || 'there'}! 👋
                    </h1>
                    <p className="text-lg text-gray-600">
                        To personalize your experience, please tell us how you plan to use Andha Kanoon.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-10">
                    {/* Freelancer Card */}
                    <div
                        onClick={() => setSelectedRole('freelancer')}
                        className={cn(
                            "cursor-pointer relative p-8 rounded-2xl border-2 transition-all duration-200 bg-white hover:shadow-lg",
                            selectedRole === 'freelancer'
                                ? "border-primary ring-1 ring-primary shadow-md"
                                : "border-gray-200 hover:border-primary/50"
                        )}
                    >
                        {selectedRole === 'freelancer' && (
                            <div className="absolute top-4 right-4 text-primary">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                        )}
                        <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-6">
                            <UserIcon className="w-7 h-7 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Freelancer</h3>
                        <p className="text-gray-500 text-sm leading-relaxed">
                            I want to check contracts for safety, understand clauses, and protect my rights before signing.
                        </p>
                    </div>

                    {/* Business Card */}
                    <div
                        onClick={() => setSelectedRole('business')}
                        className={cn(
                            "cursor-pointer relative p-8 rounded-2xl border-2 transition-all duration-200 bg-white hover:shadow-lg",
                            selectedRole === 'business'
                                ? "border-primary ring-1 ring-primary shadow-md"
                                : "border-gray-200 hover:border-primary/50"
                        )}
                    >
                        {selectedRole === 'business' && (
                            <div className="absolute top-4 right-4 text-primary">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                        )}
                        <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center mb-6">
                            <Building2 className="w-7 h-7 text-purple-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Business</h3>
                        <p className="text-gray-500 text-sm leading-relaxed">
                            I want to manage multiple contracts, compare drafts, and ensure compliance for my company.
                        </p>
                    </div>
                </div>

                <div className="flex justify-center">
                    <Button
                        size="lg"
                        disabled={!selectedRole || isSubmitting}
                        onClick={handleContinue}
                        className="w-full md:w-auto min-w-[200px] h-12 text-base"
                    >
                        {isSubmitting ? 'Setting up...' : 'Continue to Dashboard'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
