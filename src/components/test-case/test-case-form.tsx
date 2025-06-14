'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePermission } from '@/lib/rbac/use-permission';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { TestCaseService } from '@/lib/api/services';
import { TestCase as ApiTestCase } from '@/lib/api/interfaces';
import { fixTestCaseNameClient, isAutoUseAISuggestionEnabledClient } from '@/lib/ai/ai-client';

// Define form schema with Zod
const formSchema = z.object({
  name: z.string().min(3, { message: 'Name must be at least 3 characters' }),
  status: z.string().min(1, { message: 'Status is required' }),
  isManual: z.boolean(),
  tags: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface TagOption {
  value: string;
  label: string;
}

// Use local interface for our component that's compatible with the UI needs
interface TestCaseProps {
  id: string;
  name: string;
  status: string;
  isManual: boolean;
  tags: string[];
}

interface TestCaseFormProps {
  projectId: string;
  testCase?: any; // Use any to avoid type issues
  isEditing?: boolean;
}

// Define a compatible interface for API calls
interface ApiPayload {
  name: string;
  status: string;
  isManual: boolean;
  tags: string; // String format for API
}

export function TestCaseForm({ projectId, testCase, isEditing = false }: TestCaseFormProps) {
  console.log('TestCaseForm render');
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFixingName, setIsFixingName] = useState(false);
  const [serverAISuggestionEnabled, setServerAISuggestionEnabled] = useState(false);
  const [allTags, setAllTags] = useState<TagOption[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tagOptions, setTagOptions] = useState<TagOption[]>([]);
  
  // Per seed-roles.ts: "project.update" permission is for both "Create and update projects, fixtures and test cases"
  const hasUpdatePermission = usePermission('project.update');
  
  // Use useMemo to prevent recreation of the service instance on each render
  const testCaseService = useMemo(() => new TestCaseService(), []);
  
  // Status options
  const statusOptions = useMemo(() => [
    { value: 'pending', label: 'Pending' },
    { value: 'active', label: 'Active' },
    { value: 'deprecated', label: 'Deprecated' },
    { value: 'draft', label: 'Draft' },
  ], []);

  // Sample tag suggestions if API fails
  const defaultTagOptions = useMemo(() => [
    { value: 'regression', label: 'Regression' },
    { value: 'smoke', label: 'Smoke' },
    { value: 'api', label: 'API' },
    { value: 'ui', label: 'UI' },
    { value: 'performance', label: 'Performance' },
    { value: 'security', label: 'Security' },
    { value: 'accessibility', label: 'Accessibility' },
  ], []);

  // Initialize form with default values or existing test case
  const defaultValues = useMemo(() => ({
    name: testCase?.name || '',
    status: testCase?.status || 'pending',
    isManual: testCase?.isManual || false,
    tags: '',  // Initialize empty and set separately to avoid loops
  }), [testCase?.name, testCase?.status, testCase?.isManual]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  // One-time initialization of form and selectedTags
  useEffect(() => {
    if (!testCase) return;
    
    try {
      let tagsArray: string[] = [];
      
      // Handle the case when tags is already an array
      if (Array.isArray(testCase.tags)) {
        tagsArray = testCase.tags;
      } 
      // Handle the case when tags is a string
      else if (typeof testCase.tags === 'string' && testCase.tags) {
        tagsArray = testCase.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
      }
      
      // Set tags in state once
      setSelectedTags(tagsArray);
      
      // Set form value once
      if (tagsArray.length > 0) {
        form.setValue('tags', tagsArray.join(','), { shouldDirty: false });
      }
      
    } catch (error) {
      console.error('Error processing testCase tags:', error);
    }
  }, [testCase, form]);

  // Check server-side AI suggestion setting on mount
  useEffect(() => {
    async function checkAISetting() {
      try {
        const isEnabled = await isAutoUseAISuggestionEnabledClient();
        setServerAISuggestionEnabled(isEnabled);
      } catch (error) {
        console.error('Error checking AI suggestion setting:', error);
        setServerAISuggestionEnabled(false);
      }
    }
    
    checkAISetting();
  }, []);

  // Fetch tag options only once when component mounts
  useEffect(() => {
    let isMounted = true;
    console.log('Fetch tags useEffect running');
    
    async function fetchTags() {
      if (!projectId) return;
      
      try {
        console.log(`Fetching tags for project: ${projectId}`);
        const tags = await testCaseService.getProjectTags(projectId);
        
        if (isMounted) {
          console.log('Tags fetched successfully:', tags);
          setTagOptions(tags);
        }
      } catch (error) {
        console.error('Error fetching tags:', error);
        if (isMounted) {
          setTagOptions(defaultTagOptions);
        }
      }
    }

    fetchTags();
    
    // Cleanup function to prevent setting state on unmounted component
    return () => {
      isMounted = false;
    };
  }, [projectId]); // Remove testCaseService from dependency array since it's stable

  // Create a new project tag
  const createProjectTag = useCallback(async (tagValue: string) => {
    try {
      const newTag = await testCaseService.createProjectTag(projectId, tagValue);
      console.log('New tag created:', newTag);
      
      // Update tag options with the new tag
      setTagOptions(prev => {
        if (prev.some(t => t.value === newTag.value)) {
          return prev;
        }
        return [...prev, newTag];
      });
    } catch (error) {
      console.error('Error creating tag:', error);
    }
  }, [projectId, testCaseService]);

  // Handle adding a tag - use function reference stability
  const handleAddTag = useCallback((tag: string) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag || selectedTags.includes(trimmedTag)) return;
    
    // Create new tags array
    const newTags = [...selectedTags, trimmedTag];
    
    // Update tags state
    setSelectedTags(newTags);
    
    // Update form value
    form.setValue('tags', newTags.join(','), { shouldDirty: true });
    
    // Clear input
    setTagInput('');
    
    // Add to tag options if it doesn't exist
    if (!tagOptions.some(option => option.value === trimmedTag)) {
      // Create a new tag in the project
      createProjectTag(trimmedTag);
    }
  }, [selectedTags, tagOptions, createProjectTag, form]);

  // Handle removing a tag - use function reference stability
  const handleRemoveTag = useCallback((tag: string) => {
    // Create new tags array
    const newTags = selectedTags.filter(t => t !== tag);
    
    // Update tags state
    setSelectedTags(newTags);
    
    // Update form value
    form.setValue('tags', newTags.join(','), { shouldDirty: true });
  }, [selectedTags, form]);

  // Handle tag input key down
  const handleTagInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(tagInput);
    }
  }, [tagInput, handleAddTag]);

  // Handle auto-fix test case name when Tab is pressed (only if server AI suggestion is disabled)
  const handleTestCaseNameKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Only trigger client-side AI fix if server-side AI suggestion is disabled
    if (e.key === 'Tab' && !e.shiftKey && !serverAISuggestionEnabled) {
      const currentName = form.getValues('name');
      if (currentName && currentName.trim() && !isFixingName) {
        try {
          setIsFixingName(true);
          const fixedName = await fixTestCaseNameClient(currentName.trim());
          if (fixedName && fixedName !== currentName.trim()) {
            form.setValue('name', fixedName, { shouldDirty: true });
            toast.success('Test case name has been improved');
          }
        } catch (error) {
          console.error('Error fixing test case name:', error);
          // Silently fail - don't show error to user as this is an enhancement feature
        } finally {
          setIsFixingName(false);
        }
      }
    }
  }, [form, isFixingName, serverAISuggestionEnabled]);

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    if (!hasUpdatePermission) {
      toast.error('You do not have permission to create or update test cases.');
      return;
    }

    try {
      setIsSubmitting(true);

      // Prepare the payload as ApiPayload
      const payload: ApiPayload = {
        name: values.name,
        status: values.status,
        isManual: values.isManual,
        tags: selectedTags.join(',') // Join tags as comma-separated string
      };

      console.log('[TestCaseForm] Submitting test case with payload:', payload);
      console.log('[TestCaseForm] Project ID:', projectId);

      let response: any;

      // Try-catch block specifically for the API call
      try {
        if (isEditing && testCase?.id) {
          console.log('[TestCaseForm] Updating test case ID:', testCase.id);
          response = await testCaseService.updateTestCase(projectId, testCase.id, payload as any);
        } else {
          console.log('[TestCaseForm] Creating new test case');
          response = await testCaseService.createTestCase(projectId, payload as any);
        }
      } catch (apiError) {
        console.error('[TestCaseForm] API call error:', apiError);
        toast.error(apiError instanceof Error ? apiError.message : 'Failed to communicate with the server');
        return;
      }

      console.log('[TestCaseForm] API response:', response);
      
      // Check if response exists
      if (!response) {
        console.error('[TestCaseForm] Empty response received from API');
        toast.error('Error: No response received from API');
        return;
      }
      
      // Check if response has an ID
      if (!response.id) {
        console.error('[TestCaseForm] Response missing ID:', response);
        toast.error('Error: Invalid response from API (missing ID)');
        return;
      }

      toast.success(
        isEditing ? 'Test case updated successfully' : 'Test case created successfully'
      );

      // Simplify navigation logic - force browser navigation in both cases
      const navigateTo = `/projects/${projectId}/test-cases/${response.id}`;
      console.log(`[TestCaseForm] Navigating to: ${navigateTo}`);
      
      // Force direct navigation using window.location
      if (typeof window !== 'undefined') {
        // Force page change
        window.location.href = navigateTo;
      }
      
    } catch (error) {
      console.error('[TestCaseForm] Unexpected error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit Test Case' : 'Create New Test Case'}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name {isFixingName && <span className="text-sm text-gray-500">(fixing...)</span>}</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter test case name" 
                      {...field} 
                      onKeyDown={handleTestCaseNameKeyDown}
                      disabled={isFixingName}
                    />
                  </FormControl>
                  <FormDescription>
                    A descriptive name for the test case.{' '}
                    {serverAISuggestionEnabled ? 
                      'AI suggestions are automatically applied on save.' : 
                      'Press Tab to auto-improve the name.'
                    }
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The current status of this test case
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1 mb-2">
                      {selectedTags.map(tag => (
                        <Badge 
                          key={tag} 
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {tag}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => handleRemoveTag(tag)}
                          />
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input 
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={handleTagInputKeyDown}
                          placeholder="Add tag..." 
                          className="flex-1"
                        />
                      </FormControl>
                      <Button 
                        type="button" 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleAddTag(tagInput)}
                        disabled={!tagInput.trim()}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tagOptions.map(option => (
                        <Badge 
                          key={option.value} 
                          variant="outline"
                          className="cursor-pointer hover:bg-secondary"
                          onClick={() => handleAddTag(option.value)}
                        >
                          {option.label}
                        </Badge>
                      ))}
                    </div>
                    <input type="hidden" {...field} />
                  </div>
                  <FormDescription>
                    Add tags to categorize this test case
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isManual"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Manual Test</FormLabel>
                    <FormDescription>
                      Check this if this is a manual test case that will not be automated
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Close
              </Button>
              <Button type="submit" disabled={isSubmitting || !hasUpdatePermission}>
                {isSubmitting ? 'Saving...' : isEditing ? 'Update Test Case' : 'Create Test Case'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
} 