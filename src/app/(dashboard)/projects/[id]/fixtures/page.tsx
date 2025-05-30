import { notFound, redirect } from 'next/navigation';
import { Metadata } from 'next';
import { ProjectRepository } from '@/lib/db/repositories/project-repository';
import { Project, FixturePageProps } from '@/types';

// Fetch project using ProjectRepository directly in server-side
async function fetchProject(projectId: string): Promise<Project | null> {
  try {
    const projectRepository = new ProjectRepository();
    return await projectRepository.findById(projectId);
  } catch (error) {
    console.error('Error fetching project:', error);
    return null;
  }
}

export async function generateMetadata({ params }: FixturePageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const project = await fetchProject(resolvedParams.id);
  
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
  const resolvedParams = await params;
  const { id } = resolvedParams;
  
  // Redirect to project page with fixtures tab activated via query parameter
  redirect(`/projects/${id}?tab=fixtures`);
} 