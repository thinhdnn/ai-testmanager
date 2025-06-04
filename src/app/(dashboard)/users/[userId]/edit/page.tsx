import { Metadata } from 'next';
import { ChangeEmailForm } from '@/components/user/change-email-form';
import { ChangePasswordForm } from '@/components/user/change-password-form';
import { UserRolesForm } from '@/components/user/user-roles-form';
import { UserDetail } from '@/components/user/user-detail';
import { PageProps } from '@/types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export const metadata: Metadata = {
  title: 'Edit User',
  description: 'Edit user information',
};

export default async function EditUserPage({ params }: PageProps) {
  const { userId } = await params;
  return (
    <div className="container mx-auto py-10 space-y-8">
      <UserDetail userId={userId} />
      <div className="flex justify-center">
        <Tabs defaultValue="email" className="w-full max-w-3xl">
          <TabsList className="mb-4">
            <TabsTrigger value="email">Change Email</TabsTrigger>
            <TabsTrigger value="password">Change Password</TabsTrigger>
            <TabsTrigger value="roles">Manage Roles</TabsTrigger>
          </TabsList>
          <TabsContent value="email">
            <ChangeEmailForm userId={userId} />
          </TabsContent>
          <TabsContent value="password">
            <ChangePasswordForm userId={userId} />
          </TabsContent>
          <TabsContent value="roles">
            <UserRolesForm userId={userId} />
          </TabsContent>
        </Tabs>
      </div>
      {/* Enable/Disable button is in UserDetail */}
    </div>
  );
} 