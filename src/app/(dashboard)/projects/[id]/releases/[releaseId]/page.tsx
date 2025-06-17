"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Edit, Trash2, ArrowLeft, Plus, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbSeparator 
} from '@/components/ui/breadcrumb';
import { formatDate } from '@/lib/utils/date';
import { ReleaseService, ProjectService } from '@/lib/api/services';
import { toast } from 'sonner';
import Link from 'next/link';

const releaseService = new ReleaseService();
const projectService = new ProjectService();

interface Release {
  id: string;
  name: string;
  version: string;
  description: string | null;
  status: string;
  startDate: Date;
  endDate: Date | null;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TestCase {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  version?: string;
}

interface Project {
  id: string;
  name: string;
}

const getReleaseStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'planning':
      return 'bg-blue-100 text-blue-800';
    case 'in_progress':
      return 'bg-yellow-100 text-yellow-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function ReleaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const releaseId = params.releaseId as string;
  
  const [release, setRelease] = useState<Release | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadProject();
    loadRelease();
    loadTestCases();
  }, [projectId, releaseId]);

  const loadProject = async () => {
    try {
      const data = await projectService.getProject(projectId);
      setProject(data);
    } catch (error) {
      console.error('Failed to load project:', error);
      toast.error('Failed to load project');
    }
  };

  const loadRelease = async () => {
    try {
      const data = await releaseService.getRelease(projectId, releaseId);
      setRelease(data);
    } catch (error) {
      console.error('Failed to load release:', error);
      toast.error('Failed to load release');
    }
  };

  const loadTestCases = async () => {
    try {
      const data = await releaseService.getReleaseTestCases(projectId, releaseId);
      // Transform the data to include version from ReleaseTestCase mapping
      const formattedTestCases = data.map((item: any) => ({
        id: item.testCase.id,
        name: item.testCase.name,
        description: item.testCase.description,
        status: item.testCase.status,
        priority: item.testCase.priority || 'Medium',
        version: item.version, // Version from ReleaseTestCase
      }));
      setTestCases(formattedTestCases);
    } catch (error) {
      console.error('Failed to load test cases:', error);
      toast.error('Failed to load test cases');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!release) return;
    
    if (!confirm(`Are you sure you want to delete release "${release.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsDeleting(true);
      await releaseService.deleteRelease(projectId, releaseId);
      toast.success('Release deleted successfully');
      router.push(`/projects/${projectId}/releases`);
    } catch (error) {
      console.error('Failed to delete release:', error);
      toast.error('Failed to delete release');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRemoveTestCase = async (testCaseId: string) => {
    if (!confirm('Are you sure you want to remove this test case from the release?')) {
      return;
    }

    try {
      await releaseService.removeTestCaseFromRelease(projectId, releaseId, testCaseId);
      setTestCases(prev => prev.filter(tc => tc.id !== testCaseId));
      toast.success('Test case removed from release');
    } catch (error) {
      console.error('Failed to remove test case:', error);
      toast.error('Failed to remove test case');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-4">
        <div className="flex flex-col space-y-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/projects">Projects</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href={`/projects/${projectId}`}>{project?.name || 'Loading...'}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href={`/projects/${projectId}?tab=releases`}>Releases</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink>Loading...</BreadcrumbLink>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        
        <div className="flex justify-center items-center min-h-[70vh]">
          <div className="animate-spin h-8 w-8 border-4 border-green-500 rounded-full border-t-transparent"></div>
        </div>
      </div>
    );
  }

  if (!release) {
    return (
      <div className="space-y-6 p-4">
        <div className="flex flex-col space-y-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/projects">Projects</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href={`/projects/${projectId}`}>{project?.name || 'Project'}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href={`/projects/${projectId}?tab=releases`}>Releases</BreadcrumbLink>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Release not found</h1>
          <Link href={`/projects/${projectId}?tab=releases`}>
            <Button>Back to Releases</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col space-y-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/projects">Projects</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={`/projects/${projectId}`}>{project?.name}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={`/projects/${projectId}?tab=releases`}>Releases</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink>{release?.name}</BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            asChild
            className="flex items-center gap-1"
          >
            <Link href={`/projects/${projectId}?tab=releases`}>
              <ChevronLeft className="h-4 w-4" />
              Back to Releases
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <CardTitle className="text-2xl">{release.name}</CardTitle>
              <CardDescription>
                {release.description} • Version {release.version}
              </CardDescription>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/projects/${projectId}/releases/${releaseId}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Status</h3>
              <Badge className={getReleaseStatusColor(release.status)}>
                {release.status.replace('_', ' ')}
              </Badge>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Start Date</h3>
              <p>{formatDate(new Date(release.startDate))}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">End Date</h3>
              <p>{release.endDate ? formatDate(new Date(release.endDate)) : 'Not set'}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Last Updated</h3>
              <p>{formatDate(new Date(release.updatedAt))}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="test-cases">Test Cases ({testCases.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Release Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm text-gray-500">Start Date</h4>
                  <p>{formatDate(new Date(release.startDate))}</p>
                </div>
                {release.endDate && (
                  <div>
                    <h4 className="font-semibold text-sm text-gray-500">End Date</h4>
                    <p>{formatDate(new Date(release.endDate))}</p>
                  </div>
                )}
                <div>
                  <h4 className="font-semibold text-sm text-gray-500">Created</h4>
                  <p>{formatDate(new Date(release.createdAt))}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-500">Last Updated</h4>
                  <p>{formatDate(new Date(release.updatedAt))}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Test Cases:</span>
                    <span>{testCases.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Passed:</span>
                    <span className="text-green-600">
                      {testCases.filter(tc => tc.status === 'passed').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Failed:</span>
                    <span className="text-red-600">
                      {testCases.filter(tc => tc.status === 'failed').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending:</span>
                    <span className="text-yellow-600">
                      {testCases.filter(tc => tc.status === 'pending').length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="test-cases" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Test Cases</h2>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Test Cases
            </Button>
          </div>

          {testCases.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                No test cases assigned to this release yet.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Version
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Priority
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {testCases.map((testCase) => (
                        <tr key={testCase.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {testCase.name}
                              </div>
                              {testCase.description && (
                                <div className="text-sm text-gray-500">
                                  {testCase.description}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant="outline">{testCase.version}</Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant={testCase.status === 'passed' ? 'default' : 
                              testCase.status === 'failed' ? 'destructive' : 'secondary'}>
                              {testCase.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant="outline">{testCase.priority}</Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveTestCase(testCase.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Remove
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 