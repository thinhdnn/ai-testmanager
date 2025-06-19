"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import Link from 'next/link';
import { Edit, Trash2, ArrowLeft, PlusCircle, Play, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistance } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TestCaseTable } from '@/components/test-case/test-case-table';
import { FixtureTable } from '@/components/fixture/fixture-table';
import { formatDate } from '@/lib/utils/date';
import { ProjectConfigForm } from '@/components/project/project-config-form';
import { RunTestDialog } from '@/components/test-case/run-test-dialog';
import { TestResultDialog } from '@/components/test-case/test-result-dialog';
import { useTestResults } from '@/lib/api/hooks/use-test-results';
import { CustomPagination } from '@/components/ui/custom-pagination';
import { ReleaseTable } from '@/components/releases/release-table';
import { useReleases } from '@/lib/api/hooks/use-releases';

interface Project {
  id: string;
  name: string;
  url: string;
  description: string | null;
  environment: string;
  createdAt: string;
  updatedAt: string;
  testCases: any[];
  fixtures: any[];
  testResults: any[];
  releases?: any[];
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [isRunTestDialogOpen, setIsRunTestDialogOpen] = useState(false);
  const [selectedTestCases, setSelectedTestCases] = useState<string[]>([]);
  const [runMode, setRunMode] = useState<'list' | 'project'>('project');
  const [selectedTestResult, setSelectedTestResult] = useState<any | null>(null);
  const [isTestResultDialogOpen, setIsTestResultDialogOpen] = useState(false);

  // Load releases data to get count for tab label
  const { releases } = useReleases(params.id as string);

  const tabList = [
    { value: 'overview', label: 'Overview' },
    { value: 'test-cases', label: `Test Cases (${project?.testCases?.length || 0})` },
    { value: 'fixtures', label: `Fixtures (${project?.fixtures?.length || 0})` },
    { value: 'releases', label: `Releases (${releases?.length || 0})` },
    { value: 'results', label: `Results (${project?.testResults?.length || 0})` },
    { value: 'configuration', label: 'Configuration' },
  ];

  // Load initial active tab from localStorage or URL
  useEffect(() => {
    // Key for localStorage
    const storageKey = `project_${params.id}_active_tab`;
    
    // First check the URL for a tab parameter (highest priority)
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    
    if (tabParam) {
      // If tab parameter exists, set it as active
      setActiveTab(tabParam);
      // Save to localStorage
      localStorage.setItem(storageKey, tabParam);
      // Clean up URL
      window.history.replaceState(null, '', `/projects/${params.id}`);
      return;
    }
    
    // Check if the URL path indicates test-cases, fixtures, or releases
    const path = window.location.pathname;
    if (path.endsWith('/test-cases')) {
      setActiveTab("test-cases");
      localStorage.setItem(storageKey, "test-cases");
      // Clean up URL
      window.history.replaceState(null, '', `/projects/${params.id}`);
      return;
    } else if (path.endsWith('/fixtures')) {
      setActiveTab("fixtures");
      localStorage.setItem(storageKey, "fixtures");
      // Clean up URL
      window.history.replaceState(null, '', `/projects/${params.id}`);
      return;
    } else if (path.endsWith('/releases')) {
      setActiveTab("releases");
      localStorage.setItem(storageKey, "releases");
      // Clean up URL
      window.history.replaceState(null, '', `/projects/${params.id}`);
      return;
    }
    
    // If no URL indicators, check localStorage (lowest priority)
    const savedTab = localStorage.getItem(storageKey);
    if (savedTab) {
      setActiveTab(savedTab);
    }
  }, [params.id]);

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

  // Handle tab change to update URL without full navigation
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Save to localStorage for persistence
    localStorage.setItem(`project_${params.id}_active_tab`, value);
    
    // For visual indication in URL, update the URL but don't add history entry
    if (value === "test-cases") {
      window.history.replaceState(null, '', `/projects/${params.id}/test-cases`);
    } else if (value === "fixtures") {
      window.history.replaceState(null, '', `/projects/${params.id}/fixtures`);
    } else if (value === "releases") {
      window.history.replaceState(null, '', `/projects/${params.id}/releases`);
    } else {
      window.history.replaceState(null, '', `/projects/${params.id}`);
    }
  };

  async function handleDelete() {
    if (!project) return;
    
    if (!confirm(`Are you sure you want to delete ${project.name}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete project');
      }
      
      toast.success('Project deleted successfully');
      router.push('/projects');
      router.refresh();
    } catch (error) {
      console.error("Failed to delete project:", error);
      toast.error("Failed to delete project");
    } finally {
      setIsDeleting(false);
    }
  }

  // Function to handle running selected test cases
  const handleRunSelectedTests = (testCaseIds: string[]) => {
    setSelectedTestCases(testCaseIds);
    setRunMode('list');
    setIsRunTestDialogOpen(true);
  };

  // Function to handle running the entire project
  const handleRunProject = () => {
    setRunMode('project');
    setIsRunTestDialogOpen(true);
  };

  // Function to handle test case deletion and update project state
  const handleTestCaseDeleted = (deletedTestCaseId: string) => {
    setProject(prevProject => {
      if (!prevProject) return prevProject;
      
      return {
        ...prevProject,
        testCases: prevProject.testCases.filter(tc => tc.id !== deletedTestCaseId)
      };
    });
  };

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
    <div className="container mx-auto p-5">
      <div className="mb-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/projects">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Link>
        </Button>
      </div>
      
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <Badge variant={getEnvironmentVariant(project.environment)}>
              {project.environment}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            {project.description || 'No description provided'}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/projects/${project.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleRunProject}
          >
            <Play className="mr-2 h-4 w-4" />
            Run All Tests
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
      
      <div className="flex gap-2 mb-6">
        {tabList.map(tab => (
          <button
            key={tab.value}
            className={`px-5 py-2 border border-black font-medium transition-all duration-150
              ${activeTab === tab.value ? 'bg-yellow-300 font-bold' : 'bg-transparent'}
            `}
            onClick={() => handleTabChange(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div className="w-full">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card p-6 rounded-lg border shadow-sm">
                <h3 className="text-xl font-semibold mb-4">Project Details</h3>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">URL</dt>
                    <dd className="mt-1">
                      <a 
                        href={project.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {project.url}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Created</dt>
                    <dd className="mt-1">{new Date(project.createdAt).toLocaleDateString()}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Last Updated</dt>
                    <dd className="mt-1">{new Date(project.updatedAt).toLocaleDateString()}</dd>
                  </div>
                </dl>
              </div>
              
              <div className="bg-card p-6 rounded-lg border shadow-sm">
                <h3 className="text-xl font-semibold mb-4">Test Statistics</h3>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Total Test Cases</dt>
                    <dd className="mt-1 text-2xl font-bold">{project.testCases?.length || 0}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Total Fixtures</dt>
                    <dd className="mt-1 text-2xl font-bold">{project.fixtures?.length || 0}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Test Results</dt>
                    <dd className="mt-1 text-2xl font-bold">{project.testResults?.length || 0}</dd>
                  </div>
                </dl>
              </div>
            </div>
            
            <div className="bg-card p-6 rounded-lg border shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Recent Test Results</h3>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/projects/${project.id}?tab=results`}>
                    View All Results
                  </Link>
                </Button>
              </div>
              
              {project.testResults?.length === 0 ? (
                <p className="text-muted-foreground">No test results yet</p>
              ) : (
                <div className="space-y-2">
                  {project.testResults?.slice(0, 5).map((result: any) => (
                    <div key={result.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        {result.success ? (
                          <CheckCircle className="text-green-500 h-5 w-5" />
                        ) : (
                          <XCircle className="text-red-500 h-5 w-5" />
                        )}
                        <div>
                        <p className="font-medium">{result.testCase?.name || 'Unnamed Test'}</p>
                          <div className="text-sm text-muted-foreground">
                            Browser: {result.browser || 'chromium'} • 
                            Duration: {result.executionTime ? (result.executionTime / 1000).toFixed(2) : '0'}s • 
                            {formatDistance(new Date(result.createdAt), new Date(), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                      <Badge variant={result.success ? "default" : "destructive"}>
                        {result.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === 'test-cases' && (
          <div>
            {(!project.testCases || project.testCases.length === 0) ? (
              <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed border-muted">
                <div className="bg-primary/10 rounded-full p-4 mx-auto w-fit mb-4">
                  <PlusCircle className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-medium mb-2">No test cases yet</h3>
                <p className="text-muted-foreground mb-6">
                  Get started by creating your first test case
                </p>
                <Button asChild>
                  <Link href={`/projects/${project.id}/test-cases/new`}>
                    Create Test Case
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <TestCaseTable
                  testCases={project.testCases.map(testCase => ({
                    ...testCase,
                    tags: testCase.tags || null,
                    lastRun: testCase.lastRun || null,
                    _count: testCase._count || { Steps: 0 }
                  }))}
                  projectId={project.id}
                  pagination={{
                    page: 1,
                    limit: project.testCases.length,
                    totalItems: project.testCases.length,
                    totalPages: 1
                  }}
                  filters={{
                    search: '',
                    status: '',
                    tags: []
                  }}
                  onRunSelected={handleRunSelectedTests}
                  onTestCaseDeleted={handleTestCaseDeleted}
                />
              </div>
            )}
          </div>
        )}
        {activeTab === 'fixtures' && (
          <div>
            {(!project.fixtures || project.fixtures.length === 0) ? (
              <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed border-muted">
                <div className="bg-primary/10 rounded-full p-4 mx-auto w-fit mb-4">
                  <PlusCircle className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-medium mb-2">No fixtures yet</h3>
                <p className="text-muted-foreground mb-6">
                  Create reusable fixtures for your test cases
                </p>
                <Button asChild>
                  <Link href={`/projects/${project.id}/fixtures/new`}>
                    Create Fixture
                  </Link>
                </Button>
              </div>
            ) : (
              <FixtureTable
                fixtures={project.fixtures.map(fixture => ({
                  ...fixture,
                  _count: fixture._count || { Steps: 0 }
                }))}
                projectId={project.id}
                pagination={{
                  page: 1,
                  limit: project.fixtures.length,
                  totalItems: project.fixtures.length,
                  totalPages: 1
                }}
                filters={{
                  search: '',
                  type: ''
                }}
              />
            )}
          </div>
        )}
        {activeTab === 'releases' && (
          <div>
            <ReleasesTabContent projectId={project.id} releases={releases} />
          </div>
        )}
        {activeTab === 'results' && (
          <div>
            <TestResultsSection projectId={project.id} />
          </div>
        )}
        {activeTab === 'configuration' && (
          <div>
            <div className="bg-card rounded-lg border shadow-sm">
              <ProjectConfigForm projectId={project.id} />
            </div>
          </div>
        )}
      </div>
      
      {/* Run Test Dialog */}
      <RunTestDialog
        isOpen={isRunTestDialogOpen}
        onClose={() => setIsRunTestDialogOpen(false)}
        projectId={project?.id || ''}
        mode={runMode}
        testCaseIds={selectedTestCases}
      />
    </div>
  );
}

function getEnvironmentVariant(environment: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (environment.toLowerCase()) {
    case 'production':
      return 'destructive';
    case 'staging':
      return 'secondary';
    case 'development':
      return 'default';
    default:
      return 'outline';
  }
}

// Add new component for releases tab
function ReleasesTabContent({ projectId, releases }: { projectId: string; releases?: any[] }) {
  const {
    releases: releasesData,
    isLoading,
    error,
  } = useReleases(projectId);

  // Use props releases if available, otherwise use hook data
  const releasesToUse = releases || releasesData;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-green-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 bg-destructive/10 rounded-lg border border-destructive/20">
        <p className="text-destructive">Error loading releases: {error.message}</p>
      </div>
    );
  }

  if (!releasesToUse || releasesToUse.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed border-muted">
        <div className="bg-primary/10 rounded-full p-4 mx-auto w-fit mb-4">
          <PlusCircle className="h-10 w-10 text-primary" />
        </div>
        <h3 className="text-xl font-medium mb-2">No releases yet</h3>
        <p className="text-muted-foreground mb-6">
          Create your first release to track project milestones
        </p>
        <Button asChild>
          <Link href={`/projects/${projectId}/releases/new`}>
            Create Release
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <ReleaseTable
      projectId={projectId}
      releases={releasesToUse}
    />
  );
}

// Add new component for test results with pagination
function TestResultsSection({ projectId }: { projectId: string }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTestResult, setSelectedTestResult] = useState<any | null>(null);
  const [isTestResultDialogOpen, setIsTestResultDialogOpen] = useState(false);
  
  const { data: testResults, pagination, loading, error } = useTestResults({
    projectId,
    page: currentPage,
    pageSize: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  if (loading) {
    return (
      <div className="bg-card p-6 rounded-lg border shadow-sm">
        <h3 className="text-xl font-semibold mb-6">Test Results</h3>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-green-500 rounded-full border-t-transparent"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card p-6 rounded-lg border shadow-sm">
        <h3 className="text-xl font-semibold mb-6">Test Results</h3>
        <div className="text-center py-12 bg-destructive/10 rounded-lg border border-destructive/20">
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card p-6 rounded-lg border shadow-sm">
      <h3 className="text-xl font-semibold mb-6">Test Results</h3>
      
      {(!testResults || testResults.length === 0) ? (
        <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed border-muted">
          <h3 className="text-xl font-medium mb-2">No test results yet</h3>
          <p className="text-muted-foreground mb-6">
            Run your test cases to see results here
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50 border-b text-sm font-medium">
              <div className="col-span-6">Test Case</div>
              <div className="col-span-3">Status</div>
              <div className="col-span-3"></div>
            </div>
            <div className="divide-y">
              {testResults.map((result: any) => (
                <div key={result.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50">
                  <div className="col-span-6">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${result.success ? 'bg-green-500' : 'bg-red-500'}`} />
                      <div>
                        <p className="font-medium">
                          {result.name || `Test Run #${result.id.slice(0, 8)}`}
                          <span className="ml-2 text-sm text-muted-foreground">
                            ({result.testCaseExecutions?.length || 0} test cases)
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(result.createdAt)} • {result.executionTime ? (result.executionTime / 1000).toFixed(2) : '0'}s • {result.browser || 'chromium'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-3">
                    <Badge variant={result.success ? 'default' : 'destructive'}>
                      {result.status}
                    </Badge>
                  </div>
                  <div className="col-span-3 text-right">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setSelectedTestResult(result);
                        setIsTestResultDialogOpen(true);
                      }}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {pagination && (
            <CustomPagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalCount={pagination.totalCount}
              pageSize={pagination.pageSize}
              onPageChange={setCurrentPage}
              hasNextPage={pagination.hasNextPage}
              hasPreviousPage={pagination.hasPreviousPage}
            />
          )}
        </>
      )}

      {/* Test Result Dialog */}
      <TestResultDialog
        isOpen={isTestResultDialogOpen}
        onClose={() => setIsTestResultDialogOpen(false)}
        testResult={selectedTestResult}
      />
    </div>
  );
} 