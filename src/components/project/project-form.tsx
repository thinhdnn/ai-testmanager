import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ProjectService } from '@/lib/api/services';
import { UIProject } from '@/types/project';

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
  project?: UIProject;
  mode: 'create' | 'edit';
}

export function ProjectForm({ project, mode }: ProjectFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const projectService = new ProjectService();

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
      const loadConfig = async () => {
        try {
          const config = await projectService.getProjectConfiguration(project.id);
          if (config.browser?.baseURL) {
            form.setValue('baseURL', config.browser.baseURL);
          }
        } catch (error) {
          console.error('Error loading project configuration:', error);
          toast.error('Failed to load project configuration');
        }
      };
      
      loadConfig();
    }
  }, [project?.id, mode, form]);

  // Form submission handler
  async function onSubmit(values: ProjectFormValues) {
    setIsSubmitting(true);
    try {
      if (!values.name || !values.baseURL) {
        throw new Error('Name and Base URL are required');
      }
      
      if (mode === 'create') {
        await projectService.createProject({
          name: values.name,
          description: values.description,
          environment: values.environment,
          baseURL: values.baseURL
        });
        toast.success('Project created successfully');
      } else if (mode === 'edit' && project?.id) {
        // Use the service with the same format as createProject
        await projectService.updateProject(project.id, {
          name: values.name,
          description: values.description,
          environment: values.environment,
          baseURL: values.baseURL
        });
        
        toast.success('Project updated successfully');
      }
      
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