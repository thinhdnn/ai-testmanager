import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export default async function TestCasesPage({ params }: Props) {
  const paramsData = await params;
  const id = paramsData.id;
  
  // Redirect to project detail page with test-cases tab active
  redirect(`/projects/${id}?tab=test-cases`);
} 