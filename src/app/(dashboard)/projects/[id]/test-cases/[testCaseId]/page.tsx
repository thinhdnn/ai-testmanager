"use client";

import { useEffect, useState } from 'react';
import { notFound, useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { TestStepsTable } from '@/components/test-case/test-steps-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbSeparator 
} from '@/components/ui/breadcrumb';
import { ChevronLeft, Edit, Copy, Play, FileCode, Loader2, History, RotateCcw, AlertCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils/date';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  params: {
    id: string;
    testCaseId: string;
  };
}

// Define interfaces for the test case versions and results
interface TestCaseVersion {
  id: string;
  version: string;
  testCaseId: string;
  name: string;
  createdAt: Date;
  stepVersions?: any[]; // Include the stepVersions property
  createdBy?: string;
}

// Using the imported TestResult type from @prisma/client
interface TestResultData {
  id: string;
  testCaseId: string;
  status: string;
  success: boolean;
  executionTime: number | null;
  createdAt: Date;
}

interface Project {
  id: string;
  name: string;
}

interface TestCase {
  id: string;
  name: string;
  status: string;
  version: string;
  isManual: boolean;
  tags: string | null;
  updatedAt: Date;
  lastRun: Date | null;
  Steps: Array<{
    id: string;
    order: number;
    action: string;
    expected: string;
    data: string | null;
    disabled: boolean;
    createdAt: Date;
    updatedAt: Date;
    testCaseId: string;
  }>;
}

// Add interface for step versions
interface StepVersion {
  id: string;
  action: string;
  data: string | null;
  expected: string | null;
  order: number;
  disabled: boolean;
  testCaseVersionId: string;
  createdAt: Date;
}

export default function TestCaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const testCaseId = params.testCaseId as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [testCase, setTestCase] = useState<TestCase | null>(null);
  const [versions, setVersions] = useState<TestCaseVersion[]>([]);
  const [testResults, setTestResults] = useState<TestResultData[]>([]);
  const [isViewVersionDialogOpen, setIsViewVersionDialogOpen] = useState(false);
  const [isRevertDialogOpen, setIsRevertDialogOpen] = useState(false);
  const [activeVersion, setActiveVersion] = useState<TestCaseVersion | null>(null);
  const [versionSteps, setVersionSteps] = useState<StepVersion[]>([]);
  const [isReverting, setIsReverting] = useState(false);
  const [activeTab, setActiveTab] = useState('steps');
  
  const refreshTestCaseData = async () => {
    try {
      const updatedTestCase = await fetchTestCase(testCaseId);
      if (updatedTestCase) {
        setTestCase(updatedTestCase);
      }
    } catch (error) {
      console.error('Error refreshing test case data:', error);
    }
  };
  
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        
        // Fetch all data in parallel
        const [projectData, testCaseData, versionsData, resultsData] = await Promise.all([
          fetchProject(projectId),
          fetchTestCase(testCaseId),
          fetchTestCaseVersions(testCaseId),
          fetchTestResults(testCaseId)
        ]);
        
        setProject(projectData);
        setTestCase(testCaseData);
        setVersions(versionsData);
        setTestResults(resultsData);
      } catch (err) {
        console.error('Error loading test case data:', err);
        setError('Failed to load test case data');
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [projectId, testCaseId]);
  
  // API fetch functions - now with relative URLs for client components
  async function fetchProject(projectId: string): Promise<Project | null> {
    const res = await fetch(`/api/projects/${projectId}`);
    
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error('Failed to fetch project');
    }
    
    return res.json();
  }

  async function fetchTestCase(testCaseId: string): Promise<TestCase | null> {
    const res = await fetch(`/api/projects/${projectId}/test-cases/${testCaseId}`);
    
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error('Failed to fetch test case');
    }
    
    return res.json();
  }

  async function fetchTestCaseVersions(testCaseId: string): Promise<TestCaseVersion[]> {
    const res = await fetch(`/api/projects/${projectId}/test-cases/${testCaseId}/versions`);
    
    if (!res.ok) {
      throw new Error('Failed to fetch test case versions');
    }
    
    return res.json();
  }

  async function fetchTestResults(testCaseId: string): Promise<TestResultData[]> {
    const res = await fetch(`/api/projects/${projectId}/test-cases/${testCaseId}/results`);
    
    if (!res.ok) {
      throw new Error('Failed to fetch test results');
    }
    
    return res.json();
  }
  
  // Status display helper
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'deprecated':
        return 'bg-red-500';
      case 'draft':
        return 'bg-gray-500';
      default:
        return 'bg-blue-500';
    }
  };
  
  // Render tags
  const renderTags = (tags: string | null) => {
    if (!tags) return null;
    
    return (
      <div className="flex flex-wrap gap-1">
        {tags.split(',').map((tag, index) => (
          <Badge key={index} variant="outline">{tag.trim()}</Badge>
        ))}
      </div>
    );
  };

  // Function to handle viewing a version
  const handleViewVersion = async (version: TestCaseVersion) => {
    setActiveVersion(version);
    
    // If stepVersions is already included in the version object
    if (version.stepVersions && Array.isArray(version.stepVersions)) {
      setVersionSteps(version.stepVersions);
      setIsViewVersionDialogOpen(true);
      return;
    }
    
    // Otherwise fetch step versions
    try {
      const stepVersionsRes = await fetch(`/api/projects/${projectId}/test-cases/${testCaseId}/versions/${version.id}/steps`);
      if (stepVersionsRes.ok) {
        const stepVersionsData = await stepVersionsRes.json();
        setVersionSteps(stepVersionsData);
      } else {
        console.error('Failed to fetch step versions');
        setVersionSteps([]);
      }
      setIsViewVersionDialogOpen(true);
    } catch (error) {
      console.error('Error fetching step versions:', error);
      toast.error('Failed to fetch version details');
    }
  };

  // Function to revert to a specific version
  const handleRevertToVersion = async () => {
    if (!activeVersion) return;
    
    try {
      setIsReverting(true);
      
      const response = await fetch(`/api/projects/${projectId}/test-cases/${testCaseId}/revert/${activeVersion.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to revert test case');
      }
      
      const data = await response.json();
      
      toast.success('Test case reverted successfully');
      setIsRevertDialogOpen(false);
      setIsViewVersionDialogOpen(false);
      
      // Update the test case data
      if (data.testCase) {
        setTestCase(data.testCase);
      }
      
      // Reload the page to show the reverted version
      router.refresh();
    } catch (error) {
      console.error('Error reverting test case:', error);
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsReverting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !project || !testCase) {
    return notFound();
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
              <BreadcrumbLink href={`/projects/${projectId}?tab=test-cases`}>Test Cases</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink>{testCase.name}</BreadcrumbLink>
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
            <Link href={`/projects/${projectId}?tab=test-cases`}>
              <ChevronLeft className="h-4 w-4" />
              Back to Test Cases
            </Link>
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <CardTitle className="text-2xl">{testCase.name}</CardTitle>
              <CardDescription>
                {testCase.isManual ? 'Manual Test' : 'Automated Test'} • Version {testCase.version}
              </CardDescription>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/projects/${projectId}/test-cases/${testCaseId}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  try {
                    const response = await fetch(`/api/projects/${projectId}/test-cases/${testCaseId}/clone`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      }
                    });
                    
                    if (!response.ok) {
                      const errorData = await response.json();
                      throw new Error(errorData.error || 'Failed to clone test case');
                    }
                    
                    const data = await response.json();
                    toast.success('Test case cloned successfully');
                    
                    // Navigate to the new test case
                    router.push(`/projects/${projectId}/test-cases/${data.testCase.id}`);
                  } catch (error) {
                    console.error('Error cloning test case:', error);
                    toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
                  }
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Clone
              </Button>
              <Button variant="default" size="sm">
                <Play className="mr-2 h-4 w-4" />
                Run Test
              </Button>
              {!testCase.isManual && (
                <Button variant="outline" size="sm">
                  <FileCode className="mr-2 h-4 w-4" />
                  View Generated Code
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Status</h3>
              <Badge className={`text-white ${getStatusColor(testCase.status)}`}>
                {testCase.status}
              </Badge>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Tags</h3>
              {renderTags(testCase.tags) || <span className="text-muted-foreground">No tags</span>}
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Last Updated</h3>
              <p>{formatDate(testCase.updatedAt)}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Last Run</h3>
              <p>{testCase.lastRun ? formatDate(testCase.lastRun) : 'Never run'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="steps" onValueChange={(value) => {
        setActiveTab(value);
        if (value === 'versions') {
          // Refresh version history when switching to versions tab
          fetchTestCaseVersions(testCaseId).then(data => {
            setVersions(data);
          }).catch(err => {
            console.error('Error fetching versions:', err);
            toast.error('Failed to load version history');
          });
        }
      }}>
        <TabsList>
          <TabsTrigger value="steps">Steps</TabsTrigger>
          <TabsTrigger value="versions">Version History</TabsTrigger>
          <TabsTrigger value="results">Test Results</TabsTrigger>
        </TabsList>
        <TabsContent value="steps" className="mt-4">
          <TestStepsTable
            steps={testCase.Steps || []}
            testCaseId={testCaseId}
            projectId={projectId}
            onVersionUpdate={(newVersion) => {
              if (testCase) {
                setTestCase({
                  ...testCase,
                  version: newVersion
                });
              }
            }}
            onStepsChange={refreshTestCaseData}
          />
        </TabsContent>
        <TabsContent value="versions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Version History</CardTitle>
              <CardDescription>
                View and restore previous versions of this test case
              </CardDescription>
            </CardHeader>
            <CardContent>
              {versions && versions.length > 0 ? (
                <div className="space-y-4">
                  {versions.map((version) => (
                    <div 
                      key={version.id} 
                      className="flex items-center justify-between border-b pb-2 last:border-0"
                    >
                      <div>
                        <p className="font-medium">Version {version.version}</p>
                        <p className="text-sm text-muted-foreground">
                          Created on {formatDate(version.createdAt)}
                          {version.createdBy && ` by ${version.createdBy}`}
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewVersion(version)}
                      >
                        <History className="mr-2 h-4 w-4" />
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No version history available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="results" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
              <CardDescription>
                View the history of test executions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {testResults && testResults.length > 0 ? (
                <div className="space-y-4">
                  {testResults.map((result) => (
                    <div 
                      key={result.id} 
                      className="flex items-center justify-between border-b pb-2 last:border-0"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={result.success ? "default" : "destructive"}
                          >
                            {result.status}
                          </Badge>
                          <p className="font-medium">Run on {formatDate(result.createdAt)}</p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Duration: {result.executionTime ? `${result.executionTime}ms` : 'N/A'}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">View Details</Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No test results available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Version Details Dialog */}
      <Dialog open={isViewVersionDialogOpen} onOpenChange={setIsViewVersionDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Version {activeVersion?.version}</DialogTitle>
            <DialogDescription>
              Created on {activeVersion && formatDate(activeVersion.createdAt)}
              {activeVersion?.createdBy && ` by ${activeVersion.createdBy}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="mb-4">
              <h3 className="text-md font-medium mb-2">Steps in this version:</h3>
              {versionSteps.length > 0 ? (
                <div className="border rounded-md">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left">Order</th>
                        <th className="p-2 text-left">Action</th>
                        <th className="p-2 text-left">Data</th>
                        <th className="p-2 text-left">Expected Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {versionSteps.sort((a, b) => a.order - b.order).map((step) => (
                        <tr key={step.id} className="border-t">
                          <td className="p-2">{step.order + 1}</td>
                          <td className="p-2">{step.action}</td>
                          <td className="p-2">{step.data || '-'}</td>
                          <td className="p-2">{step.expected || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted-foreground">No steps in this version</p>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewVersionDialogOpen(false)}>
              Close
            </Button>
            <Button 
              variant="default" 
              onClick={() => setIsRevertDialogOpen(true)}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Revert to this version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Revert Confirmation Dialog */}
      <AlertDialog open={isRevertDialogOpen} onOpenChange={setIsRevertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert to Version {activeVersion?.version}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace the current test case with version {activeVersion?.version}.
              All current steps will be replaced with the steps from this version.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReverting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.preventDefault();
                handleRevertToVersion();
              }}
              disabled={isReverting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isReverting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reverting...
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Revert
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 