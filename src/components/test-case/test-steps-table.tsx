'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { usePermission } from '@/lib/auth/use-permission';
import { isAutoUseAISuggestionEnabledClient } from '@/lib/ai/ai-client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Edit, 
  MoreVertical, 
  Trash, 
  Copy, 
  Plus, 
  MoveUp,
  MoveDown,
  Loader2,
  Code,
  ChevronRight,
  Target,
  Wrench,
  Wand2
} from 'lucide-react';
import { TestCaseService } from '@/lib/api/services/test-case-service';
import { FixtureService } from '@/lib/api/services/fixture-service';
import { Step as ApiStep } from '@/lib/api/interfaces';
import { AddStepForm, StepFormData } from '@/components/step/add-step-form';
import { Checkbox } from '@/components/ui/checkbox';

interface Step extends ApiStep {
  disabled: boolean;
}

// Helper function to convert API step to component step
const convertApiStep = (apiStep: ApiStep): Step => ({
  ...apiStep,
  type: apiStep.type || 'manual',
  disabled: apiStep.disabled ?? false,
  parentId: apiStep.parentId || apiStep.id,
  createdAt: apiStep.createdAt,
  updatedAt: apiStep.updatedAt
});

interface TestStepsTableProps {
  steps: Step[];
  projectId: string;
  testCaseId?: string;
  fixtureId?: string;
  onVersionUpdate?: (version: string) => void;
  onStepsChange?: () => void;
}

interface Fixture {
  id: string;
  name: string;
  type: string;
}

export function TestStepsTable({ 
  steps: initialSteps, 
  testCaseId, 
  fixtureId,
  projectId, 
  onVersionUpdate, 
  onStepsChange 
}: TestStepsTableProps) {
  const router = useRouter();
  const [steps, setSteps] = useState<Step[]>(initialSteps.map(convertApiStep));
  const [isLoading, setIsLoading] = useState(false);
  const [isAddStepDialogOpen, setIsAddStepDialogOpen] = useState(false);
  const [isEditStepDialogOpen, setIsEditStepDialogOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState<Step | null>(null);
  const [isFixture] = useState(!!fixtureId);
  const [activeStep, setActiveStep] = useState<Step | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMoveToDialogOpen, setIsMoveToDialogOpen] = useState(false);
  const [targetPosition, setTargetPosition] = useState<number>(1);
  const [stepToMove, setStepToMove] = useState<Step | null>(null);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [isLoadingFixtures, setIsLoadingFixtures] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [autoUseAISuggestion, setAutoUseAISuggestion] = useState(true);
  const [selectedSteps, setSelectedSteps] = useState<Set<string>>(new Set());
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  
  // Memoize service instances to prevent unnecessary re-creation
  const testCaseService = useMemo(() => new TestCaseService(), []);
  const fixtureService = useMemo(() => new FixtureService(), []);
  
  // Update local steps when props change
  useEffect(() => {
    setSteps(initialSteps.map(convertApiStep));
  }, [initialSteps]);
  
  // Use project.update instead of testcase.update for permission check
  const canEdit = usePermission('update', 'project', projectId);
  
  // Reset forms when dialogs open/close
  useEffect(() => {
    if (isAddDialogOpen) {
      fetchFixtures();
    }
  }, [isAddDialogOpen]);
  
  useEffect(() => {
    if (isEditDialogOpen) {
      fetchFixtures();
    }
  }, [isEditDialogOpen]);
  
  // Fetch fixtures from the API
  const fetchFixtures = async () => {
    try {
      setIsLoadingFixtures(true);
      
      const response = await fixtureService.getFixtures(projectId);
      setFixtures(response.fixtures || []);
    } catch (error) {
      console.error('Error fetching fixtures:', error);
    } finally {
      setIsLoadingFixtures(false);
    }
  };
  
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
  
  // Handle deleting a step
  const handleDeleteStep = async () => {
    if (!activeStep) return;
    
    try {
      setIsLoading(true);
      
      // Use the appropriate service based on whether it's a fixture or test case
      if (isFixture && activeStep.fixtureId) {
        await fixtureService.deleteFixtureStep(projectId, activeStep.fixtureId, activeStep.id);
      } else {
        await testCaseService.deleteTestCaseStep(projectId, testCaseId!, activeStep.id);
      }
      
      // Remove the step from the local state
      setSteps(prevSteps => prevSteps.filter(step => step.id !== activeStep.id));
      
      // If there's an onVersionUpdate callback, update the parent component
      if (onVersionUpdate) {
        onVersionUpdate('latest');
      }
      
      // Notify the parent component to refresh steps
      if (onStepsChange) {
        onStepsChange();
      }
      
      toast.success('Step deleted successfully');
      setIsDeleteDialogOpen(false);
      setActiveStep(null);
      
      // Also refresh the router
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle moving a step up or down
  const handleMoveStep = async (stepId: string, direction: 'up' | 'down') => {
    try {
      setIsLoading(true);
      
      // Find the step to move
      const currentIndex = steps.findIndex(step => step.id === stepId);
      if (currentIndex === -1) {
        toast.error('Step not found');
        return;
      }
      
      // Calculate the new position
      let newPosition;
      if (direction === 'up' && currentIndex > 0) {
        newPosition = currentIndex - 1;
      } else if (direction === 'down' && currentIndex < steps.length - 1) {
        newPosition = currentIndex + 1;
      } else {
        // Can't move further in this direction
        setIsLoading(false);
        return;
      }
      
      // Use the appropriate service based on whether it's a fixture or test case
      if (isFixture && steps[currentIndex].fixtureId) {
        await fixtureService.moveFixtureStep(projectId, steps[currentIndex].fixtureId!, stepId, newPosition);
      } else {
        await testCaseService.moveTestCaseStep(projectId, testCaseId!, stepId, newPosition);
      }
      
      // If there's an onVersionUpdate callback, update the parent component
      if (onVersionUpdate) {
        onVersionUpdate('latest');
      }
      
      // Notify the parent component to refresh steps
      if (onStepsChange) {
        onStepsChange();
      } else {
        // Update the local steps array with the new order
        router.refresh();
      }
      
      toast.success(`Step moved ${direction}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle toggling a step's disabled state
  const handleToggleDisabled = async (step: Step) => {
    try {
      setIsLoading(true);
      
      // Determine the new disabled state
      const newDisabledState = !step.disabled;
      
      // Use the appropriate service based on whether it's a fixture or test case
      let updatedStep;
      if (isFixture && step.fixtureId) {
        updatedStep = await fixtureService.updateFixtureStep(
          projectId, 
          step.fixtureId, 
          step.id, 
          {
            action: step.action,
            data: step.data || undefined,
            expected: step.expected || undefined,
            fixtureId: step.fixtureId || undefined,
            playwrightScript: step.playwrightScript || undefined,
            disabled: newDisabledState,
            order: step.order,
          }
        );
      } else {
        updatedStep = await testCaseService.updateTestCaseStep(
          projectId, 
          testCaseId!, 
          step.id, 
          {
            action: step.action,
            data: step.data || undefined,
            expected: step.expected || undefined,
            fixtureId: step.fixtureId || undefined,
            playwrightScript: step.playwrightScript || undefined,
            disabled: newDisabledState,
            order: step.order,
          }
        );
      }
      
      // Update the local state - use the response from server if available, otherwise use our expected state
      setSteps(prevSteps => 
        prevSteps.map(s => s.id === step.id ? 
          { ...s, disabled: updatedStep?.disabled !== undefined ? updatedStep.disabled : newDisabledState } 
          : s
        )
      );
      
      // If there's an onVersionUpdate callback, update the parent component
      if (onVersionUpdate) {
        onVersionUpdate('latest');
      }
      
      // Notify the parent component to refresh steps
      if (onStepsChange) {
        onStepsChange();
      }
      
      // Check if the update was successful by comparing with our expected state
      if (updatedStep?.disabled !== undefined && updatedStep.disabled !== newDisabledState) {
        toast.error(`Failed to ${newDisabledState ? 'disable' : 'enable'} step - server returned inconsistent state`);
      } else {
        toast.success(newDisabledState ? 'Step disabled successfully' : 'Step enabled successfully');
      }
      
      // Also refresh the router to ensure server-side data is updated
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle duplicating a step
  const handleDuplicateStep = async (step: Step) => {
    try {
      setIsLoading(true);

      // Validate that we have either a testCaseId or fixtureId
      if (!testCaseId && !fixtureId) {
        throw new Error('Either testCaseId or fixtureId must be provided');
      }
      
      let apiResult: ApiStep | undefined;
      // Use the appropriate service based on whether it's a fixture or test case
      if (isFixture && step.fixtureId) {
        apiResult = await fixtureService.duplicateFixtureStep(projectId, step.fixtureId, step.id);
      } else if (testCaseId) {
        apiResult = await testCaseService.duplicateTestCaseStep(projectId, testCaseId, step.id);
      }

      if (!apiResult) {
        throw new Error('Failed to duplicate step');
      }

      // Convert API step to component step
      const duplicatedStep = convertApiStep(apiResult);

      // Update local state with the new duplicated step
      setSteps(prevSteps => [...prevSteps, duplicatedStep]);
      
      // If there's an onVersionUpdate callback, update the parent component
      if (onVersionUpdate) {
        onVersionUpdate('latest');
      }
      
      // Notify the parent component to refresh steps
      if (onStepsChange) {
        onStepsChange();
      }
      
      toast.success('Step duplicated successfully');
      
      // Also refresh the router to ensure server-side data is updated
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle moving a step to a specific position
  const handleMoveToPosition = async () => {
    if (!stepToMove) return;
    
    try {
      setIsLoading(true);
      
      // Validate the target position
      if (targetPosition < 1 || targetPosition > steps.length) {
        toast.error(`Position must be between 1 and ${steps.length}`);
        return;
      }
      
      // Convert from UI position (1-based) to API position (0-based)
      const apiPosition = targetPosition - 1;
      
      // Use the appropriate service based on whether it's a fixture or test case
      if (isFixture && stepToMove.fixtureId) {
        await fixtureService.moveFixtureStep(
          projectId, 
          stepToMove.fixtureId, 
          stepToMove.id, 
          apiPosition
        );
      } else {
        await testCaseService.moveTestCaseStep(
          projectId, 
          testCaseId!, 
          stepToMove.id, 
          apiPosition
        );
      }
      
      // If there's an onVersionUpdate callback, update the parent component
      if (onVersionUpdate) {
        onVersionUpdate('latest');
      }
      
      // Notify the parent component to refresh steps
      if (onStepsChange) {
        onStepsChange();
      }
      
      toast.success(`Step moved to position ${targetPosition}`);
      setIsMoveToDialogOpen(false);
      
      // Also refresh the router
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle adding a new step
  const handleAddStep = async (data: StepFormData) => {
    try {
      setIsLoading(true);
      let result: ApiStep | undefined;

      // Validate that we have either a testCaseId or fixtureId
      if (!testCaseId && !fixtureId) {
        throw new Error('Either testCaseId or fixtureId must be provided');
      }

      // Use the appropriate service based on whether it's a fixture or test case
      if (isFixture && fixtureId) {
        result = await fixtureService.createFixtureStep(projectId, fixtureId, {
          action: data.action,
          data: data.data || undefined,
          expected: data.expected || undefined,
          playwrightScript: data.playwrightScript || undefined,
        });
      } else if (testCaseId) {
        const stepData = {
          action: data.action,
          data: data.data || undefined,
          expected: data.expected || undefined,
          playwrightScript: data.playwrightScript || undefined,
          fixtureId: data.fixtureId,
        };

        result = await testCaseService.createTestCaseStep(projectId, testCaseId, stepData);
      }

      if (!result) {
        throw new Error('Failed to create step');
      }

      // Convert API step to component step
      const newStep = convertApiStep(result);

      // Update local state with the new step
      setSteps(prevSteps => [...prevSteps, newStep]);
      
      // If there's version info and onVersionUpdate callback, update the parent component
      if (onVersionUpdate) {
        onVersionUpdate('latest');
      }

      // Notify the parent component to refresh steps
      if (onStepsChange) {
        onStepsChange();
      }
      
      toast.success('Step added successfully');
      setIsAddDialogOpen(false);
      
      // Also refresh the router to ensure server-side data is updated
      router.refresh();
    } catch (error) {
      console.error('Error adding step:', error);
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle updating a step
  const handleUpdateStep = async (data: StepFormData) => {
    try {
      setIsLoading(true);

      // Validate that we have either a testCaseId or fixtureId
      if (!testCaseId && !fixtureId) {
        throw new Error('Either testCaseId or fixtureId must be provided');
      }

      if (activeStep) {
        let apiResult: ApiStep | undefined;

        if (isFixture && fixtureId) {
          apiResult = await fixtureService.updateFixtureStep(
            projectId,
            fixtureId,
            activeStep.id,
            {
              action: data.action,
              data: data.data || undefined,
              expected: data.expected || undefined,
              playwrightScript: data.playwrightScript || undefined,
            }
          );
        } else if (testCaseId) {
          apiResult = await testCaseService.updateTestCaseStep(
            projectId,
            testCaseId,
            activeStep.id,
            {
              action: data.action,
              data: data.data || undefined,
              expected: data.expected || undefined,
              playwrightScript: data.playwrightScript || undefined,
              fixtureId: data.fixtureId,
            }
          );
        }

        if (!apiResult) {
          throw new Error('Failed to update step');
        }

        // Convert API step to component step
        const updatedStep = convertApiStep(apiResult);

        // Update local state with the updated step
        setSteps(prevSteps => 
          prevSteps.map(step => step.id === activeStep.id ? updatedStep : step)
        );
        
        // If there's an onVersionUpdate callback, update the parent component
        if (onVersionUpdate) {
          onVersionUpdate('latest');
        }
        
        // Notify the parent component to refresh steps
        if (onStepsChange) {
          onStepsChange();
        }
        
        toast.success('Step updated successfully');
        setIsEditDialogOpen(false);
        setActiveStep(null);
        
        // Also refresh the router
        router.refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Add new function to handle import
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
      const response = await fetch(`/api/projects/${projectId}/test-cases/${testCaseId}/steps/analyze`, {
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
      
      // If there's an onVersionUpdate callback, update the parent component
      if (onVersionUpdate) {
        onVersionUpdate('latest');
      }
      
      // Notify the parent component to refresh steps
      if (onStepsChange) {
        onStepsChange();
      }

      toast.success('Steps imported successfully');
      setIsImportDialogOpen(false);
      setImportCode('');
      
      // Also refresh the router
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsImporting(false);
    }
  };

  // Add handler for selecting/deselecting all steps
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSteps(new Set(steps.map(step => step.id)));
    } else {
      setSelectedSteps(new Set());
    }
  };

  // Add handler for selecting/deselecting individual step
  const handleSelectStep = (stepId: string, checked: boolean) => {
    const newSelected = new Set(selectedSteps);
    if (checked) {
      newSelected.add(stepId);
    } else {
      newSelected.delete(stepId);
    }
    setSelectedSteps(newSelected);
  };

  // Add handler for bulk deletion
  const handleBulkDelete = async () => {
    try {
      setIsLoading(true);
      
      // Delete each selected step
      for (const stepId of selectedSteps) {
        const step = steps.find(s => s.id === stepId);
        if (!step) continue;

        if (isFixture && step.fixtureId) {
          await fixtureService.deleteFixtureStep(projectId, step.fixtureId, stepId);
        } else if (testCaseId) {
          await testCaseService.deleteTestCaseStep(projectId, testCaseId, stepId);
        }
      }
      
      // Remove deleted steps from local state
      setSteps(prevSteps => prevSteps.filter(step => !selectedSteps.has(step.id)));
      
      // Clear selection
      setSelectedSteps(new Set());
      
      // Update version if needed
      if (onVersionUpdate) {
        onVersionUpdate('latest');
      }
      
      // Notify parent to refresh
      if (onStepsChange) {
        onStepsChange();
      }
      
      toast.success('Selected steps deleted successfully');
      setIsBulkDeleteDialogOpen(false);
      
      // Refresh router
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardDescription>
              Define the steps required to execute this test case
            </CardDescription>
          </div>
          
          {steps.length > 0 && (
            <div className="flex gap-2">
              {selectedSteps.size > 0 && (
                <Button 
                  variant="destructive"
                  onClick={() => setIsBulkDeleteDialogOpen(true)}
                  disabled={!canEdit || isLoading}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete Selected ({selectedSteps.size})
                </Button>
              )}
              {autoUseAISuggestion && (
                <Button 
                  variant="outline"
                  onClick={() => setIsImportDialogOpen(true)}
                  disabled={!canEdit}
                >
                  <Wand2 className="mr-2 h-4 w-4" />
                  Import with AI
                </Button>
              )}
              <Button 
                onClick={() => setIsAddDialogOpen(true)}
                disabled={!canEdit}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Step
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {steps.length === 0 ? (
          <div className="text-center p-8">
            <p className="text-muted-foreground mb-4">
              This test case has no steps defined yet.
            </p>
            <div className="flex gap-2 justify-center">
              {autoUseAISuggestion && (
            <Button 
                  variant="outline"
                  onClick={() => setIsImportDialogOpen(true)}
                  disabled={!canEdit}
                >
                  <Wand2 className="mr-2 h-4 w-4" />
                  Import with AI
                </Button>
              )}
              <Button 
                onClick={() => setIsAddDialogOpen(true)}
              disabled={!canEdit}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add First Step
            </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox 
                      checked={selectedSteps.size === steps.length}
                      onCheckedChange={handleSelectAll}
                      disabled={!canEdit}
                    />
                  </TableHead>
                  <TableHead className="w-[80px]">Order</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(steps) && steps.map((step) => {
                  if (!step) return null;
                  return (
                    <TableRow 
                      key={step.id || 'unknown'} 
                      className={`${step.disabled === true ? 'bg-muted/30' : ''} h-[40px]`}
                    >
                      <TableCell className="py-1">
                        <Checkbox 
                          checked={selectedSteps.has(step.id)}
                          onCheckedChange={(checked: boolean) => handleSelectStep(step.id, checked)}
                          disabled={!canEdit}
                        />
                      </TableCell>
                      <TableCell className="font-medium py-1">
                        <div className="flex items-center gap-1">
                          {typeof step.order === 'number' ? step.order : '-'}
                        </div>
                      </TableCell>
                      <TableCell className={`${step.disabled === true ? 'text-muted-foreground' : ''} py-1`}>
                        {step.action || '-'}
                    </TableCell>
                      <TableCell className={`${step.disabled === true ? 'text-muted-foreground' : ''} py-1`}>
                      {step.data || '-'}
                    </TableCell>
                      <TableCell className={`${step.disabled === true ? 'text-muted-foreground' : ''} py-1`}>
                      {step.expected || '-'}
                    </TableCell>
                      <TableCell className="py-1">
                        <Badge 
                          variant={step.disabled === true ? 'destructive' : 'default'}
                          className="cursor-pointer text-xs"
                          onClick={() => canEdit && step && handleToggleDisabled(step)}
                        >
                          {step.disabled === true ? 'Disabled' : 'Enabled'}
                        </Badge>
                    </TableCell>
                      <TableCell className="text-right py-1">
                      {canEdit && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setActiveStep(step);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateStep(step)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleMoveStep(step.id, 'up')}
                                disabled={step.order === 0 || isLoading}
                              >
                                <MoveUp className="mr-2 h-4 w-4" />
                                Move Up
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleMoveStep(step.id, 'down')}
                                disabled={step.order === steps.length - 1 || isLoading}
                              >
                                <MoveDown className="mr-2 h-4 w-4" />
                                Move Down
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setStepToMove(step);
                                  setTargetPosition(1);
                                  setIsMoveToDialogOpen(true);
                                }}
                                disabled={isLoading}
                              >
                                <Target className="mr-2 h-4 w-4" />
                                Move To...
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleToggleDisabled(step)}
                                disabled={isLoading}
                              >
                                {step.disabled ? (
                                  <>
                                    <Badge variant="destructive" className="mr-2 h-4 text-xs">Off</Badge>
                                    Enable Step
                                  </>
                                ) : (
                                  <>
                                    <Badge variant="default" className="mr-2 h-4 text-xs">On</Badge>
                                    Disable Step
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setActiveStep(step);
                                setIsDeleteDialogOpen(true);
                              }}
                              className="text-destructive"
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      
      {/* Add Step Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Step</DialogTitle>
            <DialogDescription>
              {isFixture 
                ? "Add a new step to your fixture. Steps are executed in order." 
                : "Add a new step to your test case. Steps are executed in order."}
            </DialogDescription>
          </DialogHeader>
          
          <AddStepForm 
            onSubmit={handleAddStep}
            onCancel={() => setIsAddDialogOpen(false)}
            isSubmitting={isLoading}
            initialData={{ action: '', data: '', expected: '', playwrightScript: '' }}
            isFixture={isFixture}
            fixtures={fixtures}
          />
        </DialogContent>
      </Dialog>
      
      {/* Edit Step Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Step</DialogTitle>
            <DialogDescription>
              {isFixture 
                ? "Update the details of this fixture step." 
                : "Update the details of this test step."}
            </DialogDescription>
          </DialogHeader>
          
          {activeStep && (
            <AddStepForm 
              onSubmit={handleUpdateStep}
              onCancel={() => setIsEditDialogOpen(false)}
              isSubmitting={isLoading}
              initialData={{ 
                action: activeStep.action || '', 
                data: activeStep.data || '', 
                expected: activeStep.expected || '', 
                playwrightScript: activeStep.playwrightScript || '',
                fixtureId: activeStep.fixtureId || ''
              }}
              title="Update Step"
              isFixture={isFixture}
              fixtures={fixtures}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Step Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Step</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this step? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteStep} 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Step'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Move To Dialog */}
      <Dialog open={isMoveToDialogOpen} onOpenChange={setIsMoveToDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Move Step to Position</DialogTitle>
            <DialogDescription>
              Enter the position number you want to move this step to (1-{steps.length}).
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="position" className="text-sm font-medium">
                Position
              </label>
              <Input
                id="position"
                type="number"
                min={1}
                max={steps.length}
                value={targetPosition}
                onChange={(e) => setTargetPosition(parseInt(e.target.value) || 1)}
                className="col-span-3"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMoveToDialogOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleMoveToPosition} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Moving...
                </>
              ) : (
                'Move'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import with AI Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-none w-auto min-w-[500px]">
          <DialogHeader>
            <DialogTitle>Import Steps with AI</DialogTitle>
            <DialogDescription>
              Paste your Playwright code here. Each line will be converted into a test step using AI.
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

      {/* Bulk Delete Dialog */}
      <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Selected Steps</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedSteps.size} selected steps? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkDeleteDialogOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleBulkDelete} 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                `Delete ${selectedSteps.size} Steps`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
} 