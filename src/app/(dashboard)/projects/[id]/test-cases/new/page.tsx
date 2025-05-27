import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { TestCaseForm } from '@/components/test-case/test-case-form';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { headers } from 'next/headers';
import { getProjectApiUrl } from '@/lib/api-utils';

interface Project {
  id: string;
  name: string;
  description?: string;
}

interface Props {
  params: Promise<{
    id: string;
  }>;
}

async function fetchProject(projectId: string): Promise<Project | null> {
  // Use the utility function to get the absolute URL
  const url = getProjectApiUrl(projectId);
  const headersList = await headers();
  
  const res = await fetch(url, { 
    headers: headersList,
    cache: 'no-store' 
  });
  
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error('Failed to fetch project');
  }
  
  return res.json();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const paramsCopy = await Promise.resolve(params);
  const id = paramsCopy.id;
  const project = await fetchProject(id);
  
  if (!project) {
    return {
      title: 'Project Not Found',
    };
  }
  
  return {
    title: `${project.name} - New Test Case`,
    description: `Create a new test case for ${project.name}`,
  };
}

export default async function NewTestCasePage({ params }: Props) {
  const paramsCopy = await Promise.resolve(params);
  const id = paramsCopy.id;
  const project = await fetchProject(id);
  
  if (!project) {
    notFound();
  }
  
  return (
    <div className="space-y-4 p-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/projects">Projects</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/projects/${id}`}>{project.name}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/projects/${id}/test-cases`}>Test Cases</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink>New</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      
      <div className="max-w-3xl mx-auto mt-8">
        <TestCaseForm projectId={id} />
      </div>
    </div>
  );
} 