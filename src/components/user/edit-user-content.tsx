'use client';

import { useState } from 'react';
import { ChangeEmailForm } from '@/components/user/change-email-form';
import { ChangePasswordForm } from '@/components/user/change-password-form';
import { UserRolesForm } from '@/components/user/user-roles-form';
import { UserDetail } from '@/components/user/user-detail';
import { Card, CardContent } from '@/components/ui/card';

export function EditUserContent({ userId }: { userId: string }) {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardContent className="p-6 space-y-8">
          <UserDetail userId={userId} />
          <div className="flex justify-center">
            <UserEditTabs userId={userId} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function UserEditTabs({ userId }: { userId: string }) {
  const [tab, setTab] = useState<'email' | 'password' | 'roles'>('email');
  return (
    <div className="w-full max-w-3xl">
      <div className="flex gap-2 mb-4">
        <button
          className={`px-3 py-1.5 text-sm border-2 border-foreground font-medium transition-all duration-150 rounded-md ${tab === 'email' ? 'bg-primary text-primary-foreground shadow-[2px_2px_0px_0px_hsl(var(--foreground))] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]' : 'bg-transparent hover:bg-accent hover:text-accent-foreground'}`}
          onClick={() => setTab('email')}
        >
          Change Email
        </button>
        <button
          className={`px-3 py-1.5 text-sm border-2 border-foreground font-medium transition-all duration-150 rounded-md ${tab === 'password' ? 'bg-primary text-primary-foreground shadow-[2px_2px_0px_0px_hsl(var(--foreground))] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]' : 'bg-transparent hover:bg-accent hover:text-accent-foreground'}`}
          onClick={() => setTab('password')}
        >
          Change Password
        </button>
        <button
          className={`px-3 py-1.5 text-sm border-2 border-foreground font-medium transition-all duration-150 rounded-md ${tab === 'roles' ? 'bg-primary text-primary-foreground shadow-[2px_2px_0px_0px_hsl(var(--foreground))] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]' : 'bg-transparent hover:bg-accent hover:text-accent-foreground'}`}
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