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
          className={`px-5 py-2 border border-black font-medium transition-all duration-150 ${tab === 'email' ? 'bg-yellow-300 font-bold' : 'bg-transparent'}`}
          onClick={() => setTab('email')}
        >
          Change Email
        </button>
        <button
          className={`px-5 py-2 border border-black font-medium transition-all duration-150 ${tab === 'password' ? 'bg-yellow-300 font-bold' : 'bg-transparent'}`}
          onClick={() => setTab('password')}
        >
          Change Password
        </button>
        <button
          className={`px-5 py-2 border border-black font-medium transition-all duration-150 ${tab === 'roles' ? 'bg-yellow-300 font-bold' : 'bg-transparent'}`}
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