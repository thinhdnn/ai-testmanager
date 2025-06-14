'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { usePermission } from '@/lib/auth/use-permission';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
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
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbSeparator 
} from '@/components/ui/breadcrumb';
import {
  ChevronLeft,
  Edit,
  Trash,
  Clock,
  Copy,
  FileCode,
  AlertTriangle,
  Loader2,
  History,
  RotateCcw,
  Plus,
  Code,
  ChevronRight,
  FileText,
  Wand2,
} from 'lucide-react';
import { formatDate } from '@/lib/utils/date';
import { TestStepsTable } from '@/components/test-case/test-steps-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AddStepForm, StepFormData } from '@/components/step/add-step-form';
import { ProjectService, FixtureService } from '@/lib/api/services';
import { Fixture as ApiFixture, FixtureVersion as ApiFixtureVersion, Step as ApiStep, Project } from '@/lib/api/interfaces';
import { isAutoUseAISuggestionEnabledClient } from '@/lib/ai/ai-client';

// Custom interfaces to handle type differences
interface Fixture extends Omit<ApiFixture, 'versions' | 'steps'> {
  versions?: FixtureVersion[];
  steps?: Step[];
}

interface FixtureVersion extends Omit<ApiFixtureVersion, 'version' | 'steps'> {
  version: string; // Component expects string, API returns number
  steps?: Step[];
}

interface Step extends Omit<ApiStep, 'disabled'> {
  disabled: boolean; // Component expects boolean, API might return undefined
}

// Type conversion functions
const convertApiFixture = (apiFixture: ApiFixture): Fixture => {
  const result: Fixture = {
    ...apiFixture,
  };
  
  // Add versions if they exist
  if ('versions' in apiFixture && Array.isArray(apiFixture.versions)) {
    result.versions = apiFixture.versions.map(v => convertApiFixtureVersion(v));
  }
  
  // Add steps if they exist
  if ('steps' in apiFixture && Array.isArray(apiFixture.steps)) {
    result.steps = apiFixture.steps.map(s => convertApiStep(s));
  }
  
  return result;
};

const convertApiFixtureVersion = (apiVersion: ApiFixtureVersion): FixtureVersion => ({
  ...apiVersion,
  version: apiVersion.version.toString()
});

const convertApiStep = (apiStep: ApiStep): Step => ({
  ...apiStep,
  disabled: apiStep.disabled ?? false
});

export default function FixtureDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const fixtureId = params.fixtureId as string;
  
  const projectService = new ProjectService();
  const fixtureService = new FixtureService();
  
  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const [isAddingStep, setIsAddingStep] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewVersionDialogOpen, setIsViewVersionDialogOpen] = useState(false);
  const [isRevertDialogOpen, setIsRevertDialogOpen] = useState(false);
  const [isAddStepDialogOpen, setIsAddStepDialogOpen] = useState(false);
  const [activeVersion, setActiveVersion] = useState<FixtureVersion | null>(null);
  const [versionSteps, setVersionSteps] = useState<Step[]>([]);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [autoUseAISuggestion, setAutoUseAISuggestion] = useState(true);
  
  const canEdit = usePermission('update', 'project', projectId);
  const canDelete = usePermission('update', 'project', projectId);
  
  const fetchProject = async (projectId: string): Promise<Project | null> => {
    try {
      const project = await projectService.getProject(projectId);
      return project;
    } catch (error) {
      console.error('Failed to fetch project:', error);
      return null;
    }
  };
  
  const fetchFixture = async (): Promise<Fixture | null> => {
    try {
      const apiFixture = await fixtureService.getFixture(projectId, fixtureId);
      return apiFixture ? convertApiFixture(apiFixture) : null;
    } catch (error) {
      const errorMessage = (error as any)?.message || 'Failed to fetch fixture';
      
      if ((error as any)?.status === 403) {
        console.error('Permission error:', errorMessage);
        toast.error('You do not have permission to view this fixture');
        router.push(`/projects/${projectId}?tab=fixtures`);
      } else if ((error as any)?.status === 404) {
        console.error('Fixture fetch error:', errorMessage);
        toast.error(errorMessage);
        router.push(`/projects/${projectId}?tab=fixtures`);
      } else {
        console.error('Error fetching fixture:', error);
        toast.error(errorMessage);
      }
      return null;
    }
  };
  
  const fetchFixtureVersions = async (): Promise<FixtureVersion[]> => {
    try {
      const apiVersions = await fixtureService.getFixtureVersions(projectId, fixtureId);
      return apiVersions.map(convertApiFixtureVersion);
    } catch (error) {
      console.error('Failed to fetch fixture versions:', error);
      return [];
    }
  };
  
  const fetchFixtureSteps = async (): Promise<Step[]> => {
    try {
      const apiSteps = await fixtureService.getFixtureSteps(projectId, fixtureId);
      return apiSteps.map(convertApiStep);
    } catch (error) {
      console.error('Failed to fetch fixture steps:', error);
      return [];
    }
  };

  const fetchVersionSteps = async (versionId: string): Promise<Step[]> => {
    try {
      const apiSteps = await fixtureService.getFixtureVersionSteps(projectId, fixtureId, versionId);
      return apiSteps.map(convertApiStep);
    } catch (error) {
      console.error('Failed to fetch version steps:', error);
      return [];
    }
  };
  
  const revertFixtureToVersion = async (versionId: string): Promise<void> => {
    try {
      await fixtureService.revertFixtureToVersion(projectId, fixtureId, versionId);
    } catch (error) {
      throw error;
    }
  };
  
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [projectData, fixtureData, versionsData] = await Promise.all([
        fetchProject(projectId),
        fetchFixture(),
        fetchFixtureVersions()
      ]);
      
      setProject(projectData);
      setFixture(fixtureData);
      
      if (fixtureData) {
        // If fixture doesn't include versions, assign them from separate request
        if (!fixtureData.versions && versionsData.length > 0) {
          fixtureData.versions = versionsData;
          setFixture({...fixtureData, versions: versionsData});
        }
        
        if (fixtureData.steps) {
          setSteps(fixtureData.steps);
        } else {
          // If fixture doesn't include steps, fetch them separately
          const stepsData = await fetchFixtureSteps();
          setSteps(stepsData);
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fixtureId, projectId]);

  // Check server-side AI suggestion setting on mount
  useEffect(() => {
    async function checkAISetting() {
      try {
        const isEnabled = await isAutoUseAISuggestionEnabledClient();
        setAutoUseAISuggestion(isEnabled);
      } catch (error) {
        console.error('Error checking AI suggestion setting:', error);
        setAutoUseAISuggestion(false);
      }
    }
    
    checkAISetting();
  }, []);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await fixtureService.deleteFixture(projectId, fixtureId);
      
      toast.success('Fixture deleted successfully');
      router.push(`/projects/${projectId}?tab=fixtures`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred while deleting');
      console.error(error);
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };
  
  const handleCopyCode = () => {
    if (fixture?.playwrightScript) {
      navigator.clipboard.writeText(fixture.playwrightScript);
      toast.success('Code copied to clipboard');
    }
  };
  
  const handleViewVersion = async (version: FixtureVersion) => {
    setActiveVersion(version);
    
    try {
      const stepsData = await fetchVersionSteps(version.id);
      setVersionSteps(stepsData);
    } catch (error) {
      console.error('Failed to fetch version steps:', error);
      setVersionSteps([]);
    }
    
    setIsViewVersionDialogOpen(true);
  };
  
  const handleRevertConfirm = (version: FixtureVersion) => {
    setActiveVersion(version);
    setIsRevertDialogOpen(true);
  };
  
  const handleRevertToVersion = async () => {
    if (!activeVersion) return;
    
    try {
      setIsReverting(true);
      
      await revertFixtureToVersion(activeVersion.id);
      
      toast.success(`Fixture reverted to version from ${formatDate(activeVersion.createdAt)}`);
      setIsRevertDialogOpen(false);
      fetchData(); // Refresh fixture, project, and steps data
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred while reverting');
      console.error(error);
    } finally {
      setIsReverting(false);
    }
  };
  
  const refreshFixtureData = async () => {
    try {
      const updatedFixture = await fetchFixture();
      if (updatedFixture) {
        setFixture(updatedFixture);
        const updatedSteps = await fetchFixtureSteps();
        setSteps(updatedSteps);
      }
    } catch (error) {
      console.error('Error refreshing fixture data:', error);
    }
  };
  
  const handleAddStep = async (formData: StepFormData) => {
    try {
      setIsAddingStep(true);
      
      console.log('Playwright script before processing:', formData.playwrightScript);
      let playwrightScript = formData.playwrightScript;
      

      if (playwrightScript === undefined || playwrightScript === null) {
        if (formData.action.toLowerCase().includes('click')) {
          playwrightScript = `await page.click('[data-testid="element"]');`;
        } else if (formData.action.toLowerCase().includes('fill') || formData.action.toLowerCase().includes('input')) {
          playwrightScript = `await page.fill('[data-testid="input-field"]', 'value');`;
        } else if (formData.action.toLowerCase().includes('navigate') || formData.action.toLowerCase().includes('go to')) {
          playwrightScript = `await page.goto('/path');`;
        } else if (formData.action.toLowerCase().includes('expect') || formData.action.toLowerCase().includes('verify')) {
          playwrightScript = `await expect(page.locator('[data-testid="element"]')).toBeVisible();`;
        } else {
          playwrightScript = `// Default action for: ${formData.action}\nawait page.waitForTimeout(1000);`;
        }
      }
      
      console.log('Playwright script after processing:', playwrightScript);
      
      await fixtureService.createFixtureStep(projectId, fixtureId, {
        action: formData.action,
        data: formData.data || undefined,
        expected: formData.expected || undefined,
        playwrightScript: playwrightScript,
      });
      
      // Update the steps list
      await refreshFixtureData();
      
      // Close dialog
      setIsAddStepDialogOpen(false);
      
      toast.success('Step added successfully');
    } catch (error) {
      console.error('Error adding step:', error);
      toast.error(error instanceof Error ? error.message : 'An error occurred while adding step');
    } finally {
      setIsAddingStep(false);
    }
  };
  
  const handleClone = async () => {
    try {
      setIsCloning(true);
      
      const clonedFixture = await fixtureService.cloneFixture(projectId, fixtureId);
      
      toast.success('Fixture cloned successfully');
      
      console.log('Clone result:', clonedFixture);

      if (!clonedFixture || !clonedFixture.id) {
        console.error('Invalid response from clone API:', clonedFixture);
        toast.error('Could not retrieve cloned fixture ID');
        return;
      }
      
      // Navigate to the new fixture
      router.push(`/projects/${projectId}/fixtures/${clonedFixture.id}`);
    } catch (error) {
      console.error('Error cloning fixture:', error);
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsCloning(false);
    }
  };
  
  const handleImport = async () => {
    try {
      setIsImporting(true);

      // Split the code into lines and filter out empty lines
      const codeLines = importCode
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      if (codeLines.length === 0) {
        toast.error('Please enter some code to import');
        return;
      }

      // Call the API
      const response = await fetch(`/api/projects/${projectId}/fixtures/${fixtureId}/steps/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          codeLines
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to import steps');
      }

      const createdSteps = await response.json();

      // Update local state with new steps
      setSteps(prevSteps => [...prevSteps, ...createdSteps.map(convertApiStep)]);
      
      toast.success('Steps imported successfully');
      setIsImportDialogOpen(false);
      setImportCode('');
      
      // Refresh fixture data
      await refreshFixtureData();
      
      // Also refresh the router
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsImporting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!fixture) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Fixture Not Found</h2>
            <p className="text-muted-foreground mb-6">The fixture you're looking for doesn't exist or you don't have permission to view it.</p>
            <Button asChild>
              <Link href={`/projects/${projectId}?tab=fixtures`}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to Fixtures
              </Link>
            </Button>
          </CardContent>
        </Card>
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
              <BreadcrumbLink href={`/projects/${projectId}`}>{project?.name || 'Project'}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={`/projects/${projectId}?tab=fixtures`}>Fixtures</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink>{fixture.name}</BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="flex items-center gap-1"
            >
              <Link href={`/projects/${projectId}?tab=fixtures`}>
                <ChevronLeft className="h-4 w-4" />
                Back to Fixtures
              </Link>
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            {canEdit && (
              <>
                <Button
                  variant="outline"
                  onClick={handleClone}
                  disabled={isCloning}
                >
                  {isCloning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cloning...
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Clone
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/projects/${projectId}/fixtures/${fixtureId}/edit`)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </>
            )}
            {canDelete && (
              <Button
                variant="destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash className="mr-2 h-4 w-4" />
                    Delete
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <CardTitle className="text-2xl">{fixture.name}</CardTitle>
              <CardDescription>
                Fixture Type: {fixture.type}
                {fixture.exportName && ` • Export: ${fixture.exportName}`}
              </CardDescription>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {fixture.playwrightScript && (
                <Button variant="outline" size="sm" onClick={handleCopyCode}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Code
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Type</h3>
              <Badge variant="outline" className="capitalize">
                {fixture.type}
              </Badge>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Export Name</h3>
              <p>{fixture.exportName || 'None'}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Last Updated</h3>
              <p>{formatDate(fixture.updatedAt)}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Created By</h3>
              <p>{fixture.createdBy || 'Unknown'}</p>
            </div>
            
            {fixture.fixtureFilePath && (
              <div className="col-span-2">
                <h3 className="text-sm font-medium text-muted-foreground mb-1">File Path</h3>
                <p className="font-mono text-sm">{fixture.fixtureFilePath}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="steps">
        <TabsList>
          <TabsTrigger value="steps">Steps</TabsTrigger>
          {/* <TabsTrigger value="code">Code</TabsTrigger> */} {/* Removed Code Tab Trigger */}
          <TabsTrigger value="versions">Version History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="steps" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                {/* Conditionally render Add Step button only if steps exist */}
                {canEdit && steps.length > 0 && (
                  <div className="flex space-x-2">
                    {autoUseAISuggestion && (
                      <Button 
                        variant="outline"
                        onClick={() => setIsImportDialogOpen(true)}
                        disabled={isLoading}
                      >
                        <Wand2 className="mr-1 h-4 w-4" /> Import with AI
                      </Button>
                    )}
                    <Button 
                      onClick={() => {
                        setIsAddStepDialogOpen(true);
                      }}
                      size="sm"
                      variant="outline"
                      disabled={isLoading}
                    >
                      <Plus className="mr-1 h-4 w-4" /> Add Step
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : steps.length > 0 ? (
                <TestStepsTable 
                  steps={steps}
                  projectId={projectId}
                  fixtureId={fixtureId}
                  onStepsChange={refreshFixtureData}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-3" />
                  <h3 className="text-lg font-medium">No steps yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Define the steps for this fixture to start testing
                  </p>
                  {/* Conditionally render Add First Step button and Import with AI button only if no steps exist */}
                  {canEdit && steps.length === 0 && (
                    <div className="flex space-x-2">
                      {autoUseAISuggestion && (
                        <Button 
                          variant="outline"
                          onClick={() => setIsImportDialogOpen(true)}
                          disabled={isLoading}
                        >
                          <Wand2 className="mr-1 h-4 w-4" /> Import with AI
                        </Button>
                      )}
                      <Button
                        onClick={() => {
                          setIsAddStepDialogOpen(true);
                        }}
                        variant="outline"
                      >
                        <Plus className="mr-1 h-4 w-4" /> Add First Step
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Removed Code Tab Content */}
        
        <TabsContent value="versions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Version History
              </CardTitle>
              <CardDescription>
                View and restore previous versions of this fixture
              </CardDescription>
            </CardHeader>
            <CardContent>
              {fixture.versions && fixture.versions.length > 0 ? (
                <div className="space-y-4">
                  {fixture.versions.map((version) => (
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
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewVersion(version)}
                        >
                          <History className="mr-2 h-4 w-4" />
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No version history available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* View Version Dialog */}
      <Dialog open={isViewVersionDialogOpen} onOpenChange={setIsViewVersionDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Version {activeVersion?.version}</DialogTitle>
            <DialogDescription>
              Created on {activeVersion ? formatDate(activeVersion.createdAt) : ''}
              {activeVersion?.createdBy && ` by ${activeVersion.createdBy}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h3 className="text-md font-medium">Name</h3>
              <p>{activeVersion?.name}</p>
            </div>
            
            <div className="space-y-2">
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
                          <td className="p-2">{step.order}</td>
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
            
            {activeVersion?.playwrightScript && (
              <div className="space-y-2">
                <h3 className="text-md font-medium">Playwright Script</h3>
                <div className="bg-muted p-4 rounded-md overflow-auto max-h-80">
                  <pre className="font-mono text-sm whitespace-pre-wrap">
                    {activeVersion.playwrightScript}
                  </pre>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewVersionDialogOpen(false)}>
              Close
            </Button>
            
            {canEdit && activeVersion && (
              <Button 
                variant="default" 
                onClick={() => {
                  setIsViewVersionDialogOpen(false);
                  handleRevertConfirm(activeVersion);
                }}
                disabled={new Date(activeVersion.createdAt).getTime() === new Date(fixture?.updatedAt || '').getTime()}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Revert to This Version
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Revert Confirmation Dialog */}
      <AlertDialog open={isRevertDialogOpen} onOpenChange={setIsRevertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert to Version {activeVersion?.version}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revert the fixture to version {activeVersion?.version} from {activeVersion ? formatDate(activeVersion.createdAt) : ''}. 
              Your current version will be saved in the version history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReverting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
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
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure you want to delete this fixture?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the fixture
              and all its version history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Step Dialog */}
      <Dialog open={isAddStepDialogOpen} onOpenChange={setIsAddStepDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Step</DialogTitle>
            <DialogDescription>
              Add a new step to your fixture. Steps are executed in order.
            </DialogDescription>
          </DialogHeader>
          
          <AddStepForm 
            onSubmit={handleAddStep}
            onCancel={() => setIsAddStepDialogOpen(false)}
            isSubmitting={isAddingStep}
          />
        </DialogContent>
      </Dialog>
      
      {/* Import with AI Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-none w-auto min-w-[500px]">
          <DialogHeader>
            <DialogTitle>Import Steps with AI</DialogTitle>
            <DialogDescription>
              Paste your Playwright code here. Each line will be converted into a fixture step using AI.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="code" className="text-sm font-medium">
                Playwright Code
              </label>
              <Textarea
                id="code"
                placeholder="await page.click('button');"
                value={importCode}
                onChange={(e) => setImportCode(e.target.value)}
                className="h-[200px] font-mono whitespace-pre"
              />
              <p className="text-sm text-muted-foreground">
                Enter each Playwright command on a new line.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsImportDialogOpen(false);
              setImportCode('');
            }} disabled={isImporting}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={isImporting}>
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                'Import'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
