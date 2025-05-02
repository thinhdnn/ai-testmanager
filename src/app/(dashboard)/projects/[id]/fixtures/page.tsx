import { notFound, redirect } from 'next/navigation';
import { Metadata } from 'next';
import { headers } from 'next/headers';
import { getProjectApiUrl } from '@/lib/api-utils';

interface Project {
  id: string;
  name: string;
  description?: string;
  environment: string;
}

interface Props {
  params: {
    id: string;
  };
  searchParams: {
    page?: string;
    search?: string;
    type?: string;
  };
}

// Fetch project from API - keeping just for metadata generation
async function fetchProject(projectId: string): Promise<any> {
  const url = getProjectApiUrl(projectId);
  const res = await fetch(url, {
    headers: headers(),
    cache: 'no-store'
  });
  
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error('Failed to fetch project');
  }
  
  return res.json();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = await fetchProject(params.id);
  
  if (!project) {
    return {
      title: 'Project Not Found',
    };
  }
  
  return {
    title: `${project.name} - Fixtures`,
    description: `Manage fixtures for ${project.name}`,
  };
}

export default async function FixturesPage({ params }: Props) {
  const { id } = params;
  
  // Redirect to project page with fixtures tab activated via query parameter
  redirect(`/projects/${id}?tab=fixtures`);
} 