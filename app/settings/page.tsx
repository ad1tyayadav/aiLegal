import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from 'next/navigation';
import { getUserRole, updateUserRole } from '@/app/actions/user.actions';
import Navbar from '@/components/landing/Navbar';
import { Button } from "@/components/ui/button";
import { User, Building2, CheckCircle2 } from 'lucide-react';

export default async function SettingsPage() {
    const { userId } = await auth();
    if (!userId) redirect('/');

    const user = await currentUser();
    const currentRole = await getUserRole();

    return (
        <div className="min-h-screen bg-gray-50/50">
            <Navbar />

            <main className="max-w-2xl mx-auto px-4 py-12">
                <h1 className="text-3xl font-heading font-bold text-gray-900 mb-8">Settings</h1>

                {/* Profile Section */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4">Profile Information</h2>
                    <div className="flex items-center gap-4">
                        <img
                            src={user?.imageUrl}
                            alt={user?.firstName || 'User'}
                            className="w-16 h-16 rounded-full border"
                        />
                        <div>
                            <p className="font-medium text-gray-900">{user?.fullName}</p>
                            <p className="text-sm text-gray-500">{user?.emailAddresses[0].emailAddress}</p>
                        </div>
                    </div>
                </div>

                {/* Role Section */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-semibold">Account Role</h2>
                            <p className="text-sm text-gray-500">Change how you use the platform</p>
                        </div>
                        <div className="px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full capitalize">
                            Current: {currentRole || 'None'}
                        </div>
                    </div>

                    <div className="grid gap-4">
                        <form action={async () => {
                            'use server';
                            await updateUserRole('freelancer');
                        }}>
                            <button
                                type="submit"
                                className={`w-full flex items-center p-4 rounded-lg border-2 text-left transition-all ${currentRole === 'freelancer'
                                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <div className="p-2 bg-blue-50 rounded-lg mr-4">
                                    <User className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-gray-900">Freelancer</h3>
                                        {currentRole === 'freelancer' && <CheckCircle2 className="w-5 h-5 text-primary" />}
                                    </div>
                                    <p className="text-sm text-gray-500">Individual analysis focus</p>
                                </div>
                            </button>
                        </form>

                        <form action={async () => {
                            'use server';
                            await updateUserRole('business');
                        }}>
                            <button
                                type="submit"
                                className={`w-full flex items-center p-4 rounded-lg border-2 text-left transition-all ${currentRole === 'business'
                                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <div className="p-2 bg-purple-50 rounded-lg mr-4">
                                    <Building2 className="w-5 h-5 text-purple-600" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-gray-900">Business</h3>
                                        {currentRole === 'business' && <CheckCircle2 className="w-5 h-5 text-primary" />}
                                    </div>
                                    <p className="text-sm text-gray-500">Team & bulk management focus</p>
                                </div>
                            </button>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}
