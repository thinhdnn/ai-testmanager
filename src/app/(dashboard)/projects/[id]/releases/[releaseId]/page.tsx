"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Edit, Trash2, ArrowLeft, Plus, ChevronLeft, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

interface AvailableTestCase {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
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

interface AddTestCasesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  releaseId: string;
  onTestCasesAdded: () => void;
  excludeTestCaseIds: string[];
}

function AddTestCasesDialog({ 
  isOpen, 
  onClose, 
  projectId, 
  releaseId, 
  onTestCasesAdded,
  excludeTestCaseIds 
}: AddTestCasesDialogProps) {
  const [availableTestCases, setAvailableTestCases] = useState<AvailableTestCase[]>([]);
  const [filteredTestCases, setFilteredTestCases] = useState<AvailableTestCase[]>([]);
  const [selectedTestCases, setSelectedTestCases] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadAvailableTestCases();
    }
  }, [isOpen, projectId]);

  useEffect(() => {
    filterTestCases();
  }, [availableTestCases, searchQuery, statusFilter, priorityFilter]);

  const loadAvailableTestCases = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/test-cases`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch test cases');
      }
      
      const data = await response.json();
      
      // API returns array directly, not wrapped in object
      const testCasesArray = Array.isArray(data) ? data : [];
      
      // Filter out test cases that are already in the release
      const filteredData = testCasesArray.filter((tc: AvailableTestCase) => 
        !excludeTestCaseIds.includes(tc.id)
      );
      
      setAvailableTestCases(filteredData);
    } catch (error) {
      console.error('Failed to load test cases:', error);
      toast.error('Failed to load test cases');
    } finally {
      setLoading(false);
    }
  };

  const filterTestCases = () => {
    let filtered = availableTestCases;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(tc => 
        tc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tc.description && tc.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(tc => tc.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(tc => tc.priority === priorityFilter);
    }

    setFilteredTestCases(filtered);
  };

  const handleTestCaseToggle = (testCaseId: string) => {
    setSelectedTestCases(prev => 
      prev.includes(testCaseId) 
        ? prev.filter(id => id !== testCaseId)
        : [...prev, testCaseId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTestCases.length === filteredTestCases.length) {
      setSelectedTestCases([]);
    } else {
      setSelectedTestCases(filteredTestCases.map(tc => tc.id));
    }
  };

  const handleSubmit = async () => {
    if (selectedTestCases.length === 0) {
      toast.error('Please select at least one test case');
      return;
    }

    try {
      setSubmitting(true);
      
      await releaseService.addTestCasesToRelease(projectId, releaseId, selectedTestCases);
      
      toast.success(`${selectedTestCases.length} test case(s) added to release`);
      onTestCasesAdded();
      handleClose();
    } catch (error) {
      console.error('Failed to add test cases:', error);
      toast.error('Failed to add test cases');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedTestCases([]);
    setSearchQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Add Test Cases to Release</DialogTitle>
          <DialogDescription>
            Select test cases to add to this release. You can filter and search to find specific test cases.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search test cases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="passed">Passed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Select All Checkbox */}
          {filteredTestCases.length > 0 && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={selectedTestCases.length === filteredTestCases.length && filteredTestCases.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <label htmlFor="select-all" className="text-sm font-medium">
                Select All ({filteredTestCases.length} test cases)
              </label>
            </div>
          )}

          {/* Test Cases List */}
          <div className="border rounded-md max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin h-6 w-6 border-4 border-green-500 rounded-full border-t-transparent"></div>
              </div>
            ) : filteredTestCases.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {availableTestCases.length === 0 
                  ? "No test cases available to add" 
                  : "No test cases match your filters"
                }
              </div>
            ) : (
              <div className="divide-y">
                {filteredTestCases.map((testCase) => (
                  <div key={testCase.id} className="flex items-center space-x-3 p-4 hover:bg-muted/30">
                    <Checkbox
                      checked={selectedTestCases.includes(testCase.id)}
                      onCheckedChange={() => handleTestCaseToggle(testCase.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {testCase.name}
                          </p>
                          {testCase.description && (
                            <p className="text-sm text-muted-foreground truncate">
                              {testCase.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <Badge variant={testCase.status === 'passed' ? 'default' : 
                            testCase.status === 'failed' ? 'destructive' : 'secondary'}>
                            {testCase.status}
                          </Badge>
                          <Badge variant="outline">{testCase.priority}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={selectedTestCases.length === 0 || submitting}
          >
            {submitting ? 'Adding...' : `Add ${selectedTestCases.length} Test Case(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
  const [isAddTestCasesDialogOpen, setIsAddTestCasesDialogOpen] = useState(false);

  // Check if release is completed (read-only mode)
  const isReleaseCompleted = release?.status.toLowerCase() === 'completed';

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
              {!isReleaseCompleted && (
                <>
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
                </>
              )}
              {isReleaseCompleted && (
                <div className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded">
                  ✓ Release completed - Read only
                </div>
              )}
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
          {isReleaseCompleted && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded-full bg-green-600 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
                <h3 className="text-sm font-medium text-green-800">Release Completed</h3>
              </div>
              <p className="text-sm text-green-700 mt-1">
                This release has been completed and is now in read-only mode. No modifications can be made.
              </p>
            </div>
          )}
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
            {!isReleaseCompleted && (
              <Button size="sm" onClick={() => setIsAddTestCasesDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Test Cases
              </Button>
            )}
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
                        {!isReleaseCompleted && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        )}
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
                          {!isReleaseCompleted && (
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
                          )}
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

      {/* Add Test Cases Dialog */}
      <AddTestCasesDialog
        isOpen={isAddTestCasesDialogOpen}
        onClose={() => setIsAddTestCasesDialogOpen(false)}
        projectId={projectId}
        releaseId={releaseId}
        onTestCasesAdded={loadTestCases}
        excludeTestCaseIds={testCases.map(tc => tc.id)}
      />
    </div>
  );
} 