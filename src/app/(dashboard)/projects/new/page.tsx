"use client";

import { ProjectForm } from '@/components/project/project-form';

export default function NewProjectPage() {
  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Create New Project</h1>
        <p className="text-muted-foreground mt-1">
          Create a new test project to manage your test cases
        </p>
      </div>
      
      <div className="bg-card p-6 rounded-lg border shadow-sm">
        <ProjectForm mode="create" />
      </div>
    </div>
  );
} 