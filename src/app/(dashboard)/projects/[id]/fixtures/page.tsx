import { notFound, redirect } from 'next/navigation';
import { Metadata } from 'next';
import { ProjectService } from '@/lib/api/services';
import { Project, FixturePageProps } from '@/types';

// Fetch project using ProjectService
async function fetchProject(projectId: string): Promise<Project | null> {
  try {
    const projectService = new ProjectService();
    return await projectService.getProject(projectId);
  } catch (error) {
    console.error('Error fetching project:', error);
    return null;
  }
}

export async function generateMetadata({ params }: FixturePageProps): Promise<Metadata> {
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

export default async function FixturesPage({ params }: FixturePageProps) {
  const { id } = params;
  
  // Redirect to project page with fixtures tab activated via query parameter
  redirect(`/projects/${id}?tab=fixtures`);
} 