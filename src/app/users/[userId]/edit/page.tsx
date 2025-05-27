import { Metadata } from 'next';
import { UserForm } from '@/components/user/user-form';
import { PageProps } from '@/types';

export const metadata: Metadata = {
  title: 'Edit User',
  description: 'Edit user information',
};

export default async function EditUserPage({ params }: PageProps) {
  const { userId } = await params;

  return (
    <div className="container mx-auto py-10">
      <UserForm userId={userId} isEditing={true} />
    </div>
  );
} 