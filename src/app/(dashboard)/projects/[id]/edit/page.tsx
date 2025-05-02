"use client";

import { useEffect, useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import { ProjectForm } from '@/components/project/ProjectForm';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
  url: string;
  description: string | null;
  environment: string;
}

export default function EditProjectPage() {
  const params = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProject() {
      try {
        setLoading(true);
        const response = await fetch(`/api/projects/${params.id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            notFound();
          }
          throw new Error('Failed to fetch project');
        }
        
        const data = await response.json();
        setProject(data);
      } catch (error) {
        console.error("Failed to load project:", error);
        toast.error("Failed to load project");
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