import { notFound, redirect } from 'next/navigation';
import { Metadata } from 'next';
import { headers } from 'next/headers';
import { getProjectApiUrl, getApiUrl } from '@/lib/api-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Project {
  id: string;
  name: string;
  description?: string;
  environment: string;
}

interface TestCase {
  id: string;
  name: string;
  status: string;
  isManual: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface TestCasesResponse {
  testCases: TestCase[];
  totalItems: number;
  totalPages: number;
}

interface Props {
  params: {
    id: string;
  };
  searchParams: {
    page?: string;
    limit?: string;
    search?: string;
    status?: string;
    tags?: string;
  };
}

// Fetch project from API - keeping just for metadata generation
async function fetchProject(projectId: string): Promise<any> {
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

// Fetch test cases from API
async function fetchTestCases(projectId: string, searchParamsData: Props['searchParams']): Promise<TestCasesResponse> {
  try {
    const page = searchParamsData.page ? parseInt(searchParamsData.page) : 1;
    const limit = searchParamsData.limit ? parseInt(searchParamsData.limit) : 10;
    const searchParams = new URLSearchParams();
    
    searchParams.append('page', page.toString());
    searchParams.append('limit', limit.toString());
    
    if (searchParamsData.search) searchParams.append('search', searchParamsData.search);
    if (searchParamsData.status) searchParams.append('status', searchParamsData.status);
    if (searchParamsData.tags) searchParams.append('tags', searchParamsData.tags);
    
    // Use the getProjectApiUrl function to get an absolute URL
    const url = getProjectApiUrl(projectId, `test-cases?${searchParams.toString()}`);
    
    const headersList = await headers();
    const res = await fetch(url, {
      headers: headersList,
      cache: 'no-store'
    });
    
    if (!res.ok) {
      if (res.status === 404) {
        return {
          testCases: [],
          totalItems: 0,
          totalPages: 0
        };
      }
      
      throw new Error('Failed to fetch test cases');
    }
    
    const data = await res.json();
    
    // Ensure data has the expected structure
    return {
      testCases: data.testCases || [],
      totalItems: data.totalItems || 0,
      totalPages: data.totalPages || 0
    };
  } catch (error) {
    console.error('Error fetching test cases:', error);
    
    // Return default values in case of error
    return {
      testCases: [],
      totalItems: 0,
      totalPages: 0
    };
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const paramsData = await params;
  const project = await fetchProject(paramsData.id);
  
  if (!project) {
    return {
      title: 'Project Not Found',
    };
  }
  
  return {
    title: `${project.name} - Test Cases`,
    description: `Manage test cases for ${project.name}`,
  };
}

export default async function TestCasesPage({ params, searchParams }: Props) {
  const paramsData = await params;
  const searchParamsData = await searchParams;
  const id = paramsData.id;
  
  // Fetch project data
  const project = await fetchProject(id);
  
  if (!project) {
    notFound();
  }
  
  // Fetch test cases
  const testCasesData = await fetchTestCases(id, searchParamsData);
  
  // Ensure we have testCases array or provide a default empty array
  const testCases = testCasesData?.testCases || [];
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-semibold mb-4">Test Cases: {project.name}</h1>
      
      <div className="grid gap-4 mt-4">
        {testCases.map(testCase => (
          <Card key={testCase.id}>
            <CardHeader>
              <CardTitle>{testCase.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Status: {testCase.status}</p>
              <p>Created: {new Date(testCase.createdAt).toLocaleDateString()}</p>
            </CardContent>
          </Card>
        ))}
        
        {testCases.length === 0 && (
          <p>No test cases found.</p>
        )}
      </div>
    </div>
  );
} 