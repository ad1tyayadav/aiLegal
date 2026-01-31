'use server';

import { auth, currentUser } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const prisma = new PrismaClient();

export async function updateUserRole(role: 'freelancer' | 'business') {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
        throw new Error("Unauthorized");
    }

    const email = user.emailAddresses[0].emailAddress;

    // Upsert user: Create if new, Update if exists
    await prisma.user.upsert({
        where: { id: userId },
        update: { role: role },
        create: {
            id: userId,
            email: email,
            role: role
        }
    });

    revalidatePath('/dashboard');
    redirect('/dashboard');
}

export async function getUserRole() {
    const { userId } = await auth();
    if (!userId) return null;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
    });

    return user?.role;
}
