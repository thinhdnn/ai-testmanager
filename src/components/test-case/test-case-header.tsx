'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Plus } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  environment: string;
}

interface TestCaseHeaderProps {
  project: Project;
}

export function TestCaseHeader({ project }: TestCaseHeaderProps) {
  const router = useRouter();
  
  return (
    <div className="flex flex-col space-y-2">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/projects">Projects</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/projects/${project.id}`}>{project.name}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink>Test Cases</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.back()}
            className="flex items-center gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          
          <div>
            <h1 className="text-2xl font-bold">Test Cases</h1>
            <p className="text-muted-foreground">
              Manage test cases for {project.name} ({project.environment})
            </p>
          </div>
        </div>
        
        <Button onClick={() => router.push(`/projects/${project.id}/test-cases/new`)}>
          <Plus className="mr-2 h-4 w-4" />
          New Test Case
        </Button>
      </div>
    </div>
  );
} 