"use client";

import { useEffect, useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import { ProjectForm } from '@/components/project/project-form';
import { toast } from 'sonner';
import { ProjectService } from '@/lib/api/services';
import { UIProject } from '@/types/project';

export default function EditProjectPage() {
  const params = useParams();
  const [project, setProject] = useState<UIProject | null>(null);
  const [loading, setLoading] = useState(true);
  const projectService = new ProjectService();

  useEffect(() => {
    async function loadProject() {
      if (!params.id) {
        toast.error("Invalid project ID");
        return notFound();
      }

      try {
        setLoading(true);
        const projectId = typeof params.id === 'string' ? params.id : params.id[0];
        const apiProject = await projectService.getProject(projectId);
        
        // Map API project to component's project structure
        setProject({
          id: apiProject.id,
          name: apiProject.name,
          description: apiProject.description || null,
          environment: apiProject.environment
        });
      } catch (error) {
        console.error("Failed to load project:", error);
        toast.error("Failed to load project");
        if ((error as any)?.status === 404) {
          notFound();
        }
      } finally {
        setLoading(false);
      }
    }

    loadProject();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <div className="animate-spin h-8 w-8 border-4 border-green-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  if (!project) {
    return notFound();
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Edit Project</h1>
        <p className="text-muted-foreground mt-1">
          Update project details
        </p>
      </div>
      
      <div className="bg-card p-6 rounded-lg border shadow-sm">
        <ProjectForm mode="edit" project={project} />
      </div>
    </div>
  );
} 