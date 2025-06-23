import { Metadata } from 'next';
import { UserDetail } from '@/components/user/user-detail';
import { PageProps } from '@/types';

export const metadata: Metadata = {
  title: 'User Details',
  description: 'View user details',
};

export default async function UserDetailPage({ params }: PageProps) {
  const { userId } = await params;
  if (!userId) return null;

  return (
    <div className="container mx-auto py-10">
      <UserDetail userId={userId} />
    </div>
  );
} 