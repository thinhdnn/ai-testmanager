"use client";

import { useEffect, useState, useMemo } from 'react';
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
import { TestCase, EditTestCasePageProps } from '@/types';
import { TestCaseService } from '@/lib/api/services';

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

export default function EditTestCasePage() {
  const params = useParams();
  const projectId = params.id as string;
  const testCaseId = params.testCaseId as string;
  const testCaseService = useMemo(() => new TestCaseService(), []);
  
  const [testCase, setTestCase] = useState<TestCase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchTestCase() {
      try {
        setIsLoading(true);
        const data = await testCaseService.getTestCase(projectId, testCaseId);
        setTestCase(data);
      } catch (err: any) {
        console.error('Error fetching test case:', err);
        
        if (err.message && err.message.includes('404')) {
          notFound();
        }
        
        setError(err.message || 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchTestCase();
  }, [projectId, testCaseId, testCaseService]);
  
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