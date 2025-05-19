'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { usePermission } from '@/lib/auth/use-permission';
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
  Wrench
} from 'lucide-react';
import { TestCaseService } from '@/lib/api/services/test-case-service';
import { FixtureService } from '@/lib/api/services/fixture-service';
import { Step as ApiStep } from '@/lib/api/interfaces';

interface Step {
  id: string;
  action: string;
  data?: string | undefined;
  expected?: string | undefined;
  order: number;
  disabled: boolean;
  fixtureId?: string | undefined;
  fixture?: {
    id: string;
    name: string;
    type: string;
  } | undefined;
  playwrightScript?: string | undefined;
}

interface TestStepsTableProps {
  steps: Step[];
  testCaseId: string;
  projectId: string;
  onVersionUpdate?: (newVersion: string) => void;
  onStepsChange?: () => void;
}

interface Fixture {
  id: string;
  name: string;
  type: string;
}

export function TestStepsTable({ steps: initialSteps, testCaseId, projectId, onVersionUpdate, onStepsChange }: TestStepsTableProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [activeStep, setActiveStep] = useState<Step | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [showPlaywrightAdd, setShowPlaywrightAdd] = useState(false);
  const [showPlaywrightEdit, setShowPlaywrightEdit] = useState(false);
  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [isMoveToDialogOpen, setIsMoveToDialogOpen] = useState(false);
  const [targetPosition, setTargetPosition] = useState<number>(1);
  const [stepToMove, setStepToMove] = useState<Step | null>(null);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [isLoadingFixtures, setIsLoadingFixtures] = useState(false);
  const [showFixtureSuggestions, setShowFixtureSuggestions] = useState(false);
  const [filteredFixtures, setFilteredFixtures] = useState<Fixture[]>([]);
  
  // Memoize service instances to prevent unnecessary re-creation
  const testCaseService = useMemo(() => new TestCaseService(), []);
  const fixtureService = useMemo(() => new FixtureService(), []);
  
  // Determine if we're handling fixture steps or test case steps
  const isFixture = !!initialSteps.find(step => step.fixtureId);
  
  // Update local steps when props change
  useEffect(() => {
    setSteps(initialSteps);
  }, [initialSteps]);
  
  // Form state for adding/editing steps
  const [formData, setFormData] = useState({
    action: '',
    data: '',
    expected: '',
    fixtureId: '',
    playwrightScript: '',
  });
  
  // Use project.update instead of testcase.update for permission check
  const canEdit = usePermission('update', 'project', projectId);
  
  // Reset forms when dialogs open/close
  useEffect(() => {
    if (isAddDialogOpen) {
      setFormData({ action: '', data: '', expected: '', fixtureId: '', playwrightScript: '' });
      setShowPlaywrightAdd(false);
      fetchFixtures();
    } else {
      setShowFixtureSuggestions(false);
    }
  }, [isAddDialogOpen]);
  
  useEffect(() => {
    if (isEditDialogOpen) {
      fetchFixtures();
    } else {
      setShowPlaywrightEdit(false);
      setShowFixtureSuggestions(false);
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
  
  // Watch for action input changes to show fixture suggestions
  useEffect(() => {
    // Only show fixture suggestions for test cases, not fixtures
    if (isFixture) {
      setShowFixtureSuggestions(false);
      return;
    }
    
    // Check if the action starts with "call" (case insensitive)
    if (formData.action.trim().toLowerCase().startsWith('call')) {
      // Filter fixtures based on what's after "call " if anything
      const searchTerm = formData.action.trim().substring(5).toLowerCase();
      
      const filtered = fixtures.filter(fixture => 
        searchTerm === '' || fixture.name.toLowerCase().includes(searchTerm)
      );
      
      setFilteredFixtures(filtered);
      setShowFixtureSuggestions(true);
    } else {
      setShowFixtureSuggestions(false);
    }
  }, [formData.action, fixtures, isFixture]);
  
  // Handle selecting a fixture from suggestions
  const handleSelectFixture = (fixture: Fixture) => {
    setFormData({
      ...formData,
      action: `Call fixture: ${fixture.name}`,
      fixtureId: fixture.id
    });
    setShowFixtureSuggestions(false);
  };
  
  // Handle adding a new step
  const handleAddStep = async () => {
    if (!formData.action) {
      toast.error('Action is required');
      return;
    }
    
    try {
      setIsLoading(true);
      
      let result;
      // Use the appropriate service based on whether it's a fixture or test case
      if (isFixture) {
        result = await fixtureService.createFixtureStep(projectId, testCaseId, {
          action: formData.action,
          data: formData.data || undefined,
          expected: formData.expected || undefined,
          fixtureId: formData.fixtureId || undefined,
          playwrightScript: '', // Always use empty string for fixture steps
        });
      } else {
        const response = await testCaseService.createTestCaseStep(projectId, testCaseId, {
          action: formData.action,
          data: formData.data || undefined,
          expected: formData.expected || undefined,
          fixtureId: formData.fixtureId || undefined,
          playwrightScript: formData.playwrightScript || undefined,
        });
        result = response;
      }
      
      // Update local state with the new step
      setSteps(prevSteps => [...prevSteps, result as Step]);
      
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
      setFormData({ action: '', data: '', expected: '', fixtureId: '', playwrightScript: '' });
      
      // Also refresh the router to ensure server-side data is updated
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle editing a step
  const handleEditStep = async () => {
    if (!activeStep) return;
    
    if (!formData.action) {
      toast.error('Action is required');
      return;
    }
    
    try {
      setIsLoading(true);
      
      let result;
      // Use the appropriate service based on whether it's a fixture or test case
      if (isFixture) {
        result = await fixtureService.updateFixtureStep(
          projectId, 
          testCaseId, 
          activeStep.id, 
          {
            action: formData.action,
            data: formData.data || undefined,
            expected: formData.expected || undefined,
            fixtureId: formData.fixtureId || undefined,
            playwrightScript: '', // Always use empty string for fixture steps
            disabled: activeStep.disabled,
            order: activeStep.order,
          }
        );
      } else {
        result = await testCaseService.updateTestCaseStep(
          projectId, 
          testCaseId, 
          activeStep.id, 
          {
            action: formData.action,
            data: formData.data || undefined,
            expected: formData.expected || undefined,
            fixtureId: formData.fixtureId || undefined,
            playwrightScript: formData.playwrightScript || undefined,
            disabled: activeStep.disabled,
            order: activeStep.order,
          }
        );
      }
      
      // Update local state with the updated step
      setSteps(prevSteps => 
        prevSteps.map(step => step.id === activeStep.id ? result as Step : step)
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle deleting a step
  const handleDeleteStep = async () => {
    if (!activeStep) return;
    
    try {
      setIsLoading(true);
      
      // Use the appropriate service based on whether it's a fixture or test case
      if (isFixture && activeStep.fixtureId) {
        await fixtureService.deleteFixtureStep(projectId, activeStep.fixtureId, activeStep.id);
      } else {
        await testCaseService.deleteTestCaseStep(projectId, testCaseId, activeStep.id);
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
      const stepToMove = steps.find(step => step.id === stepId);
      if (!stepToMove) {
        toast.error('Step not found');
        return;
      }
      
      // Calculate the new position
      const currentIndex = steps.findIndex(step => step.id === stepId);
      let newPosition;
      
      if (direction === 'up' && currentIndex > 0) {
        newPosition = steps[currentIndex - 1].order;
      } else if (direction === 'down' && currentIndex < steps.length - 1) {
        newPosition = steps[currentIndex + 1].order;
      } else {
        // Can't move further in this direction
        setIsLoading(false);
        return;
      }
      
      // Use the appropriate service based on whether it's a fixture or test case
      if (isFixture && stepToMove.fixtureId) {
        await fixtureService.moveFixtureStep(projectId, stepToMove.fixtureId, stepId, newPosition);
      } else {
        await testCaseService.moveTestCaseStep(projectId, testCaseId, stepId, newPosition);
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
        // Note: In a real implementation, the API would return the updated steps array
        // For simplicity, we'll just refetch the steps
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
      console.log(`Toggling step ${step.id} from ${step.disabled} to ${newDisabledState}`);
      
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
          testCaseId, 
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
      
      console.log('Server response:', updatedStep);
      
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
      
      let result;
      // Use the appropriate service based on whether it's a fixture or test case
      if (isFixture && step.fixtureId) {
        result = await fixtureService.duplicateFixtureStep(projectId, step.fixtureId, step.id);
      } else {
        result = await testCaseService.duplicateTestCaseStep(projectId, testCaseId, step.id);
      }
      
      // Update local state with the new duplicated step
      setSteps(prevSteps => [...prevSteps, result as Step]);
      
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
          testCaseId, 
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
          <Button 
            onClick={() => {
                setFormData({ action: '', data: '', expected: '', fixtureId: '', playwrightScript: '' });
              setIsAddDialogOpen(true);
            }}
            disabled={!canEdit}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Step
          </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {steps.length === 0 ? (
          <div className="text-center p-8">
            <p className="text-muted-foreground mb-4">
              This test case has no steps defined yet.
            </p>
            <Button 
              onClick={() => {
                setFormData({ action: '', data: '', expected: '', fixtureId: '', playwrightScript: '' });
                setIsAddDialogOpen(true);
              }}
              disabled={!canEdit}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add First Step
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
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
                      <TableCell className="font-medium py-1">
                      <div className="flex items-center gap-1">
                          {typeof step.order === 'number' ? step.order + 1 : '-'}
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
                                setFormData({
                                    action: step.action || '',
                                  data: step.data || '',
                                  expected: step.expected || '',
                                  fixtureId: step.fixtureId || '',
                                    playwrightScript: step.playwrightScript || '',
                                });
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
          
          <div className="space-y-4 py-4">
            <div className="space-y-2 relative">
              <label htmlFor="action" className="text-sm font-medium">
                Action <span className="text-destructive">*</span>
              </label>
              <Input
                id="action"
                placeholder="Click the login button"
                value={formData.action}
                onChange={(e) => setFormData({ ...formData, action: e.target.value })}
              />
              {!isFixture && (
                <p className="text-xs text-muted-foreground mt-1">
                  Type 'call' to add a fixture
                </p>
              )}
              
              {/* Fixture suggestions */}
              {!isFixture && showFixtureSuggestions && filteredFixtures.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-background border border-border rounded-md shadow-md max-h-60 overflow-y-auto">
                  <div className="p-2 text-xs text-muted-foreground border-b">
                    Select a fixture:
                  </div>
                  {isLoadingFixtures ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm">Loading fixtures...</span>
                    </div>
                  ) : (
                    <div className="py-1">
                      {filteredFixtures.map((fixture) => (
                        <div
                          key={fixture.id}
                          className="px-4 py-2 text-sm hover:bg-muted cursor-pointer flex items-center"
                          onClick={() => handleSelectFixture(fixture)}
                        >
                          <Wrench className="h-4 w-4 mr-2 text-muted-foreground" />
                          {fixture.name}
                          <Badge variant="outline" className="ml-2 text-xs">
                            {fixture.type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <label htmlFor="data" className="text-sm font-medium">
                Data
              </label>
              <Input
                id="data"
                placeholder="Username: admin, Password: password123"
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="expected" className="text-sm font-medium">
                Expected Result
              </label>
              <Textarea
                id="expected"
                placeholder="User should be redirected to the dashboard"
                value={formData.expected}
                onChange={(e) => setFormData({ ...formData, expected: e.target.value })}
                rows={3}
              />
            </div>

            {/* Only show Playwright Script for test cases, not fixtures */}
            {!isFixture && (
              <div className="border border-border rounded-md">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex w-full justify-between p-3 font-medium"
                  onClick={() => setShowPlaywrightAdd(!showPlaywrightAdd)}
                >
                  <div className="flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    <span>Playwright Script</span>
                  </div>
                  <ChevronRight className={`h-4 w-4 transition-transform ${showPlaywrightAdd ? 'rotate-90' : ''}`} />
                </Button>
                
                {showPlaywrightAdd && (
                  <div className="p-3 pt-0">
                    <Textarea
                      id="playwright-script"
                      placeholder="await page.click('.login-button');"
                      value={formData.playwrightScript}
                      onChange={(e) => setFormData({ ...formData, playwrightScript: e.target.value })}
                      rows={5}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter Playwright automation code for this step
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleAddStep} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Step'
              )}
            </Button>
          </DialogFooter>
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
          
          <div className="space-y-4 py-4">
            <div className="space-y-2 relative">
              <label htmlFor="edit-action" className="text-sm font-medium">
                Action <span className="text-destructive">*</span>
              </label>
              <Input
                id="edit-action"
                placeholder="Click the login button"
                value={formData.action}
                onChange={(e) => setFormData({ ...formData, action: e.target.value })}
              />
              {!isFixture && (
                <p className="text-xs text-muted-foreground mt-1">
                  Type 'call' to add a fixture
                </p>
              )}
              
              {/* Fixture suggestions */}
              {!isFixture && showFixtureSuggestions && filteredFixtures.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-background border border-border rounded-md shadow-md max-h-60 overflow-y-auto">
                  <div className="p-2 text-xs text-muted-foreground border-b">
                    Select a fixture:
                  </div>
                  {isLoadingFixtures ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm">Loading fixtures...</span>
                    </div>
                  ) : (
                    <div className="py-1">
                      {filteredFixtures.map((fixture) => (
                        <div
                          key={fixture.id}
                          className="px-4 py-2 text-sm hover:bg-muted cursor-pointer flex items-center"
                          onClick={() => handleSelectFixture(fixture)}
                        >
                          <Wrench className="h-4 w-4 mr-2 text-muted-foreground" />
                          {fixture.name}
                          <Badge variant="outline" className="ml-2 text-xs">
                            {fixture.type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <label htmlFor="edit-data" className="text-sm font-medium">
                Data
              </label>
              <Input
                id="edit-data"
                placeholder="Username: admin, Password: password123"
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="edit-expected" className="text-sm font-medium">
                Expected Result
              </label>
              <Textarea
                id="edit-expected"
                placeholder="User should be redirected to the dashboard"
                value={formData.expected}
                onChange={(e) => setFormData({ ...formData, expected: e.target.value })}
                rows={3}
              />
            </div>

            {/* Only show Playwright Script for test cases, not fixtures */}
            {!isFixture && (
              <div className="border border-border rounded-md">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex w-full justify-between p-3 font-medium"
                  onClick={() => setShowPlaywrightEdit(!showPlaywrightEdit)}
                >
                  <div className="flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    <span>Playwright Script</span>
                  </div>
                  <ChevronRight className={`h-4 w-4 transition-transform ${showPlaywrightEdit ? 'rotate-90' : ''}`} />
                </Button>
                
                {showPlaywrightEdit && (
                  <div className="p-3 pt-0">
                    <Textarea
                      id="edit-playwright-script"
                      placeholder="await page.click('.login-button');"
                      value={formData.playwrightScript}
                      onChange={(e) => setFormData({ ...formData, playwrightScript: e.target.value })}
                      rows={5}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter Playwright automation code for this step
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleEditStep} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Step'
              )}
            </Button>
          </DialogFooter>
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
    </Card>
  );
} 