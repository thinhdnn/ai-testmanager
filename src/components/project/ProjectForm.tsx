import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

// Validation schema for project form
const projectFormSchema = z.object({
  name: z.string().min(3, { message: 'Project name must be at least 3 characters' }),
  baseURL: z.string().url({ message: 'Must be a valid URL' }),
  description: z.string().optional(),
  environment: z.enum(['development', 'staging', 'production', 'testing']),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

// Default values for new project
const defaultValues: Partial<ProjectFormValues> = {
  name: '',
  baseURL: '',
  description: '',
  environment: 'development',
};

interface ProjectFormProps {
  project?: {
    id?: string;
    name: string;
    description?: string | null;
    environment: string;
  };
  mode: 'create' | 'edit';
}

export function ProjectForm({ project, mode }: ProjectFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with project data or defaults
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: project 
      ? {
          name: project.name,
          baseURL: '', // Will be loaded from settings
          description: project.description || '',
          environment: project.environment as any,
        }
      : defaultValues,
  });

  // Load baseURL from project settings if in edit mode
  useEffect(() => {
    if (mode === 'edit' && project?.id) {
      fetch(`/api/projects/${project.id}/configuration`)
        .then(res => res.json())
        .then(data => {
          if (data.browser?.baseURL) {
            form.setValue('baseURL', data.browser.baseURL);
          }
        })
        .catch(error => {
          console.error('Error loading project configuration:', error);
        });
    }
  }, [project?.id, mode, form]);

  // Form submission handler
  async function onSubmit(values: ProjectFormValues) {
    setIsSubmitting(true);
    try {
      const url = mode === 'create' 
        ? '/api/projects' 
        : `/api/projects/${project?.id}`;
      
      const method = mode === 'create' ? 'POST' : 'PUT';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Something went wrong');
      }

      toast.success(
        mode === 'create' 
          ? 'Project created successfully' 
          : 'Project updated successfully'
      );
      
      router.push('/projects');
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message || 'Failed to save project');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Name</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter project name" 
                  {...field} 
                  autoComplete="off"
                />
              </FormControl>
              <FormDescription>
                A descriptive name for your test project
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="baseURL"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Base URL</FormLabel>
              <FormControl>
                <Input 
                  placeholder="https://example.com" 
                  {...field} 
                  autoComplete="off"
                />
              </FormControl>
              <FormDescription>
                The base URL for your application under test
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe your project..." 
                  className="resize-none"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="environment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Environment</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an environment" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="development">Development</SelectItem>
                  <SelectItem value="testing">Testing</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                The environment where this project will run tests
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Project' : 'Update Project'}
          </Button>
        </div>
      </form>
    </Form>
  );
} 