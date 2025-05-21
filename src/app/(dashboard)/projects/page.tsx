"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ProjectCard } from '@/components/project/project-card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { PlusCircle, Loader2 } from 'lucide-react';
import { UIProject, PaginationData } from '@/types/project';

export default function ProjectsPage() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<UIProject[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 12,
    totalPages: 0,
  });

  // Use useCallback to memoize the loadProjects function
  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects?page=${pagination.page}&limit=${pagination.limit}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      
      const data = await response.json();
      setProjects(data.projects || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Failed to load projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-5">
      <div className="flex flex-col gap-2 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          {projects.length > 0 && (
            <Link href="/projects/new">
              <Button size="sm" className="rounded-full gap-1.5">
                <PlusCircle className="h-4 w-4" />
                Create Project
              </Button>
            </Link>
          )}
        </div>
        <p className="text-muted-foreground">Manage your test projects and test suites</p>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-6 bg-muted/30 rounded-lg border border-dashed border-muted">
          <div className="space-y-2 max-w-md">
            <h3 className="text-xl font-medium">No projects yet</h3>
            <p className="text-muted-foreground">
              Get started by creating your first test project to organize your test cases
            </p>
          </div>
          <Link href="/projects/new">
            <Button size="lg">
              Create First Project
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
      
      {pagination.totalPages > 1 && (
        <div className="flex justify-center mt-8 gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page === 1}
            onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
            className="rounded-full"
          >
            Previous
          </Button>
          <span className="flex items-center mx-2 text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page === pagination.totalPages}
            onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
            className="rounded-full"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
