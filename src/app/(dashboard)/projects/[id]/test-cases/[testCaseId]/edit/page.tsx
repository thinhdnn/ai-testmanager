"use client";

import { useEffect, useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import { TestCaseForm } from '@/components/test-case/test-case-form';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbSeparator 
} from '@/components/ui/breadcrumb';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// Inline Skeleton component to avoid import issues
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

// Define TestCase interface directly to remove the dependency on @/types
interface TestCase {
  id: string;
  name: string;
  status: string;
  version: string;
  isManual: boolean;
  tags: string | null;
  updatedAt: string | Date;
  lastRun: string | Date | null;
  createdAt: string | Date;
  projectId: string;
  Steps?: Array<{
    id: string;
    order: number;
    action: string;
    expected: string | null;
    data: string | null;
    disabled: boolean;
    createdAt: string | Date;
    updatedAt: string | Date;
    testCaseId: string;
  }>;
}

export default function EditTestCasePage() {
  const params = useParams();
  const projectId = params.id as string;
  const testCaseId = params.testCaseId as string;
  
  const [testCase, setTestCase] = useState<TestCase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchTestCase() {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/projects/${projectId}/test-cases/${testCaseId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            notFound();
          }
          throw new Error('Failed to fetch test case');
        }
        
        const data = await response.json();
        setTestCase(data);
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchTestCase();
  }, [projectId, testCaseId]);
  
  if (error) {
    return (
      <div className="space-y-4">
        <p className="text-red-500">Error: {error}</p>
        <Link 
          href={`/projects/${projectId}/test-cases`}
          className="text-blue-500 hover:underline flex items-center gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Test Cases
        </Link>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/projects">Projects</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/projects/${projectId}`}>Project Details</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/projects/${projectId}/test-cases`}>Test Cases</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/projects/${projectId}/test-cases/${testCaseId}`}>
              {isLoading ? 'Loading...' : testCase?.name || 'Test Case'}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink>Edit</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      
      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-8 w-1/3 mb-4" />
            <Skeleton className="h-20 w-full mb-4" />
            <Skeleton className="h-10 w-full mb-4" />
            <Skeleton className="h-10 w-full mb-4" />
          </CardContent>
        </Card>
      ) : (
        <TestCaseForm projectId={projectId} testCase={testCase || undefined} isEditing={true} />
      )}
    </div>
  );
} 