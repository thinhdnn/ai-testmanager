'use client';

import { useState, useEffect } from 'react';
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
import { usePermission } from '@/lib/auth/use-permission';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';

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

interface TestCase {
  id: string;
  name: string;
  status: string;
  isManual: boolean;
  tags: string | null;
}

interface TestCaseFormProps {
  projectId: string;
  testCase?: TestCase;
  isEditing?: boolean;
}

export function TestCaseForm({ projectId, testCase, isEditing = false }: TestCaseFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagOptions, setTagOptions] = useState<TagOption[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const canEdit = usePermission('update', 'testcase', projectId);
  
  // Status options
  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'active', label: 'Active' },
    { value: 'deprecated', label: 'Deprecated' },
    { value: 'draft', label: 'Draft' },
  ];

  // Sample tag suggestions if API fails
  const defaultTagOptions = [
    { value: 'regression', label: 'Regression' },
    { value: 'smoke', label: 'Smoke' },
    { value: 'api', label: 'API' },
    { value: 'ui', label: 'UI' },
    { value: 'performance', label: 'Performance' },
    { value: 'security', label: 'Security' },
    { value: 'accessibility', label: 'Accessibility' },
  ];

  // Initialize form with default values or existing test case
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: testCase?.name || '',
      status: testCase?.status || 'pending',
      isManual: testCase?.isManual || false,
      tags: testCase?.tags || '', // This will be updated by the useEffect that sets selectedTags
    },
  });

  // Initialize selected tags from form value
  useEffect(() => {
    // If editing an existing test case, initialize selected tags from the tags string
    if (testCase?.tags) {
      const tagArray = testCase.tags.split(',').map(tag => tag.trim()).filter(Boolean);
      setSelectedTags(tagArray);
      console.log('Initialized selected tags from test case:', tagArray);
    }
  }, [testCase]);

  // Fetch tag options
  useEffect(() => {
    async function fetchTags() {
      try {
        console.log(`Fetching tags for project: ${projectId}`);
        const response = await fetch(`/api/projects/${projectId}/tags`, {
          credentials: 'include', // Include credentials for authentication
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Tags fetched successfully:', data);
          setTagOptions(data);
        } else {
          console.error('Failed to fetch tags:', response.status, response.statusText);
          // Fallback to default tags if API fails
          setTagOptions(defaultTagOptions);
        }
      } catch (error) {
        console.error('Error fetching tags:', error);
        setTagOptions(defaultTagOptions);
      }
    }

    if (projectId) {
      fetchTags();
    } else {
      console.error('Cannot fetch tags: Project ID is undefined');
      setTagOptions(defaultTagOptions);
    }
  }, [projectId]);

  // Update form value when selected tags change
  useEffect(() => {
    // Update the form with the joined tags string
    const tagsString = selectedTags.join(',');
    form.setValue('tags', tagsString);
    console.log('Updated form tags value:', tagsString);
  }, [selectedTags, form]);

  // Handle adding a tag
  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !selectedTags.includes(trimmedTag)) {
      setSelectedTags([...selectedTags, trimmedTag]);
      setTagInput('');
      
      // Add to tag options if it doesn't exist
      if (!tagOptions.some(option => option.value === trimmedTag)) {
        // Create a new tag in the project
        createProjectTag(trimmedTag);
      }
    }
  };

  // Create a new project tag
  const createProjectTag = async (tagValue: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value: tagValue }),
      });
      
      if (response.ok) {
        const newTag = await response.json();
        console.log('New tag created:', newTag);
        
        // Update tag options with the new tag
        setTagOptions(prev => {
          if (prev.some(t => t.value === newTag.value)) {
            return prev;
          }
          return [...prev, newTag];
        });
      } else {
        console.error('Failed to create tag:', response.status);
      }
    } catch (error) {
      console.error('Error creating tag:', error);
    }
  };

  // Handle removing a tag
  const handleRemoveTag = (tag: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tag));
  };

  // Handle tag input key down
  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(tagInput);
    }
  };

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    if (!canEdit) {
      toast.error('You do not have permission to edit test cases.');
      return;
    }

    try {
      setIsSubmitting(true);

      const endpoint = isEditing 
        ? `/api/projects/${projectId}/test-cases/${testCase?.id}`
        : `/api/projects/${projectId}/test-cases`;
      
      const method = isEditing ? 'PUT' : 'POST';

      // Make sure tags and isManual are properly included in the request
      const payload = {
        ...values,
        tags: selectedTags.join(','), // Use the selectedTags array directly
        isManual: values.isManual // Ensure isManual is included
      };

      // Log the payload for debugging
      console.log('Submitting test case with payload:', payload);

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('API error response:', error);
        throw new Error(error.error || 'Failed to save test case');
      }

      toast.success(
        isEditing ? 'Test case updated successfully' : 'Test case created successfully'
      );

      // If creating a new test case, navigate to the newly created test case
      if (!isEditing) {
        const data = await response.json();
        router.push(`/projects/${projectId}/test-cases/${data.id}`);
      } else {
        // If editing, refresh the page to show updated data
        router.refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
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
              <Button type="submit" disabled={isSubmitting || !canEdit}>
                {isSubmitting ? 'Saving...' : isEditing ? 'Update Test Case' : 'Create Test Case'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
} 