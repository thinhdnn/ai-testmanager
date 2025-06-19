'use client';
import { Metadata } from 'next';
import { ChangeEmailForm } from '@/components/user/change-email-form';
import { ChangePasswordForm } from '@/components/user/change-password-form';
import { UserRolesForm } from '@/components/user/user-roles-form';
import { UserDetail } from '@/components/user/user-detail';
import { PageProps } from '@/types';

export default async function EditUserPage({ params }: PageProps) {
  const { userId } = await params;
  // Use a client-side state for tab selection
  // This requires 'use client' at the top if you want to use hooks in this file
  // For now, let's assume you want a server component, so we use a workaround
  // If you want a client component, add 'use client' and move this logic to a separate file
  return (
    <div className="container mx-auto py-10 space-y-8">
      <UserDetail userId={userId} />
      <div className="flex justify-center">
        <UserEditTabs userId={userId} />
      </div>
      {/* Enable/Disable button is in UserDetail */}
    </div>
  );
}

// Client component for retro tabs
import { useState } from 'react';
function UserEditTabs({ userId }: { userId: string }) {
  const [tab, setTab] = useState<'email' | 'password' | 'roles'>('email');
  return (
    <div className="w-full max-w-3xl">
      <div className="flex gap-2 mb-4">
        <button
          className={`px-5 py-2 border-2 border-foreground font-medium transition-all duration-150 rounded-md ${tab === 'email' ? 'bg-primary text-primary-foreground shadow-[2px_2px_0px_0px_hsl(var(--foreground))] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]' : 'bg-transparent hover:bg-accent hover:text-accent-foreground'}`}
          onClick={() => setTab('email')}
        >
          Change Email
        </button>
        <button
          className={`px-5 py-2 border-2 border-foreground font-medium transition-all duration-150 rounded-md ${tab === 'password' ? 'bg-primary text-primary-foreground shadow-[2px_2px_0px_0px_hsl(var(--foreground))] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]' : 'bg-transparent hover:bg-accent hover:text-accent-foreground'}`}
          onClick={() => setTab('password')}
        >
          Change Password
        </button>
        <button
          className={`px-5 py-2 border-2 border-foreground font-medium transition-all duration-150 rounded-md ${tab === 'roles' ? 'bg-primary text-primary-foreground shadow-[2px_2px_0px_0px_hsl(var(--foreground))] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]' : 'bg-transparent hover:bg-accent hover:text-accent-foreground'}`}
          onClick={() => setTab('roles')}
        >
          Manage Roles
        </button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-black">
        {tab === 'email' && <ChangeEmailForm userId={userId} />}
        {tab === 'password' && <ChangePasswordForm userId={userId} />}
        {tab === 'roles' && <UserRolesForm userId={userId} />}
      </div>
    </div>
  );
} 