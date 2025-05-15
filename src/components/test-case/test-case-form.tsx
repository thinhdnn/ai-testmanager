'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
  const [tagOptions, setTagOptions] = useState<TagOption[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  
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
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: testCase?.name || '',
      status: testCase?.status || 'pending',
      isManual: testCase?.isManual || false,
      tags: Array.isArray(testCase?.tags) ? testCase.tags.join(',') : '', // Handle both array and string
    },
  });

  // Initialize selected tags from form value
  useEffect(() => {
    if (testCase?.tags) {
      try {
        // Handle the case when tags is already an array
        if (Array.isArray(testCase.tags)) {
          setSelectedTags(testCase.tags);
        } 
        // Handle the case when tags is a string
        else if (typeof testCase.tags === 'string') {
          const tagsArray = testCase.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
          setSelectedTags(tagsArray);
        }
      } catch (error) {
        console.error('Error parsing tags:', error);
        setSelectedTags([]);
      }
    }
  }, [testCase]);

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
  }, [projectId, defaultTagOptions]); // Only re-run if projectId changes

  // Update form value when selected tags change
  useEffect(() => {
    // Update the form with the joined tags string
    const tagsString = selectedTags.join(',');
    form.setValue('tags', tagsString);
    console.log('Updated form tags value:', tagsString);
  }, [selectedTags, form]);

  // Handle adding a tag
  const handleAddTag = useCallback((tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !selectedTags.includes(trimmedTag)) {
      setSelectedTags(prev => [...prev, trimmedTag]);
      setTagInput('');
      
      // Add to tag options if it doesn't exist
      if (!tagOptions.some(option => option.value === trimmedTag)) {
        // Create a new tag in the project
        createProjectTag(trimmedTag);
      }
    }
  }, [selectedTags, tagOptions]);

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

  // Handle removing a tag
  const handleRemoveTag = useCallback((tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
  }, []);

  // Handle tag input key down
  const handleTagInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(tagInput);
    }
  }, [tagInput, handleAddTag]);

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
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter test case name" {...field} />
                  </FormControl>
                  <FormDescription>
                    A descriptive name for the test case
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