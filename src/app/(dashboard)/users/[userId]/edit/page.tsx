import { use } from 'react';
import { EditUserContent } from '../../../../../components/user/edit-user-content';

export default function EditUserPage({ params }: { params: Promise<{ userId: string }> }) {
  const resolvedParams = use(params);
  const userId = resolvedParams.userId;
  if (!userId) return null;

  return <EditUserContent userId={userId} />;
}