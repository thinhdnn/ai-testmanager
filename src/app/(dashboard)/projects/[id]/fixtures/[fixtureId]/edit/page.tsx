'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { z } from 'zod';
import { useForm, ControllerRenderProps } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, Loader2, FileCode, AlertTriangle } from 'lucide-react';
import { toCamelCase, toValidFileName } from '@/lib/utils/string-utils';

// Form validation schema
const fixtureFormSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .refine(value => !/[<>:"/\\|?*]/.test(value), {
      message: 'Name contains invalid characters for a name',
    }),
  type: z.enum(['data', 'logic'], {
    required_error: 'Fixture type is required',
  }),
  exportName: z.string()
    .min(1, 'Export name is required')
    .regex(/^[a-z][a-zA-Z0-9]*$/, 'Export name must start with lowercase letter and contain only letters and numbers')
    .refine(
      (value) => !/\d+$/.test(value),
      'Export name should not end with numbers'
    ),
  playwrightScript: z.string().optional(),
  filename: z.string().optional(),
});

type FixtureFormValues = z.infer<typeof fixtureFormSchema>;

interface Fixture {
  id: string;
  name: string;
  playwrightScript: string | null;
  type: string;
  exportName: string | null;
  filename: string | null;
  fixtureFilePath: string | null;
}

export default function EditFixturePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const fixtureId = params.fixtureId as string;
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [shouldAutoUpdateExportName, setShouldAutoUpdateExportName] = useState(true);
  const [shouldAutoUpdateFilename, setShouldAutoUpdateFilename] = useState(true);
  
  // Initialize form with empty values, will be updated once fixture is loaded
  const form = useForm<FixtureFormValues>({
    resolver: zodResolver(fixtureFormSchema),
    defaultValues: {
      name: '',
      type: 'data',
      exportName: '',
      playwrightScript: '',
      filename: '',
    },
  });
  
  // Watch name field to auto-generate exportName and filename
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'name' && value.name) {
        // Only auto-update if the flags are true (i.e., user hasn't manually changed these fields)
        if (shouldAutoUpdateExportName) {
          form.setValue('exportName', toCamelCase(value.name));
        }
        
        if (shouldAutoUpdateFilename) {
          const extension = form.getValues('type') === 'data' ? 'json' : 'js';
          form.setValue('filename', toValidFileName(value.name, extension));
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, shouldAutoUpdateExportName, shouldAutoUpdateFilename]);
  
  // Track when user manually edits fields to stop auto-updating
  const handleExportNameChange = () => {
    setShouldAutoUpdateExportName(false);
  };
  
  const handleFilenameChange = () => {
    setShouldAutoUpdateFilename(false);
  };
  
  useEffect(() => {
    fetchFixture();
  }, [fixtureId, projectId]);
  
  const fetchFixture = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/projects/${projectId}/fixtures/${fixtureId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Fixture not found');
          router.push(`/projects/${projectId}?tab=fixtures`);
          return;
        }
        throw new Error('Failed to fetch fixture');
      }
      
      const data = await response.json();
      setFixture(data);
      
      // Reset form with fixture data
      form.reset({
        name: data.name,
        type: data.type,
        exportName: data.exportName || '',
        playwrightScript: data.playwrightScript || '',
        filename: data.filename || '',
      });
    } catch (error) {
      toast.error('Failed to load fixture details');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const onSubmit = async (values: FixtureFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Ensure exportName is correctly generated from name before submitting
      if (shouldAutoUpdateExportName) {
        values.exportName = toCamelCase(values.name);
      }
      
      console.log('Updating fixture with data:', { 
        projectId, 
        fixtureId, 
        name: values.name,
        exportName: values.exportName,
        type: values.type 
      });
      
      const response = await fetch(`/api/projects/${projectId}/fixtures/${fixtureId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update fixture');
      }
      
      toast.success('Fixture updated successfully');
      router.push(`/projects/${projectId}/fixtures/${fixtureId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred while updating fixture');
      console.error(error);
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center">
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
            <p className="text-muted-foreground mb-6">The fixture you're trying to edit doesn't exist or you don't have permission to edit it.</p>
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
    <div className="container max-w-3xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5" />
            Edit Fixture: {fixture.name}
          </CardTitle>
          <div className="text-sm text-muted-foreground mt-1">
            Export name will be automatically generated as: <span className="font-mono bg-muted px-1 py-0.5 rounded">{toCamelCase(form.getValues('name'))}</span>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }: { field: ControllerRenderProps<FixtureFormValues, "name"> }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter fixture name" {...field} />
                    </FormControl>
                    <FormDescription>
                      A descriptive name for your fixture
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="type"
                render={({ field }: { field: ControllerRenderProps<FixtureFormValues, "type"> }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Update filename extension when type changes if auto-update is on
                        if (shouldAutoUpdateFilename) {
                          const currentName = form.getValues('name');
                          if (currentName) {
                            const extension = value === 'data' ? 'json' : 'js';
                            form.setValue('filename', toValidFileName(currentName, extension));
                          }
                        }
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select fixture type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="data">Data</SelectItem>
                        <SelectItem value="logic">Logic</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Data fixtures contain static data. Logic fixtures contain functions.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="playwrightScript"
                render={({ field }: { field: ControllerRenderProps<FixtureFormValues, "playwrightScript"> }) => (
                  <FormItem>
                    <FormLabel>Playwright Script</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormDescription>
                      The script to run this fixture in Playwright
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="filename"
                render={({ field }: { field: ControllerRenderProps<FixtureFormValues, "filename"> }) => (
                  <FormItem>
                    <FormLabel>Filename</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        onChange={(e) => {
                          field.onChange(e);
                          handleFilenameChange();
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      The filename for this fixture
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/projects/${projectId}/fixtures/${fixtureId}`)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
