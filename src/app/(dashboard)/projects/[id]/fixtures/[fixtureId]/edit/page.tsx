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
import { FixtureService } from '@/lib/api/services';

// Form validation schema
const fixtureFormSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .refine(value => !/[<>:"/\\|?*]/.test(value), {
      message: 'Name contains invalid characters for a name',
    }),
  type: z.enum(['extend', 'inline'], {
    required_error: 'Fixture type is required',
  }),
  exportName: z.string()
    .min(1, 'Export name is required')
    .regex(/^[a-z][a-zA-Z0-9]*$/, 'Export name must start with lowercase letter and contain only letters and numbers')
    .refine(
      (value) => !/\d+$/.test(value),
      'Export name should not end with numbers'
    ),
});

type FixtureFormValues = z.infer<typeof fixtureFormSchema>;

interface Fixture {
  id: string;
  name: string;
  type: string;
  exportName: string | null;
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
  const fixtureService = new FixtureService();
  
  // Initialize form with empty values, will be updated once fixture is loaded
  const form = useForm<FixtureFormValues>({
    resolver: zodResolver(fixtureFormSchema),
    defaultValues: {
      name: '',
      type: 'extend',
      exportName: '',
    },
  });
  
  // Watch name field to auto-generate exportName
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'name' && value.name) {
        // Only auto-update if the flags are true (i.e., user hasn't manually changed these fields)
        if (shouldAutoUpdateExportName) {
          form.setValue('exportName', toCamelCase(value.name));
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, shouldAutoUpdateExportName]);
  
  // Track when user manually edits fields to stop auto-updating
  const handleExportNameChange = () => {
    setShouldAutoUpdateExportName(false);
  };
  
  // Update type
  const handleTypeChange = (value: 'extend' | 'inline') => {
    form.setValue('type', value);
  };
  
  useEffect(() => {
    fetchFixture();
  }, [fixtureId, projectId]);
  
  const fetchFixture = async () => {
    try {
      setIsLoading(true);
      const data = await fixtureService.getFixture(projectId, fixtureId);
      
      setFixture(data);
      
      // Ensure type is a valid value
      const fixtureType = (data.type === 'extend' || data.type === 'inline') 
        ? data.type 
        : 'extend'; // Default to 'extend' if invalid type
      
      // Reset form with fixture data
      form.reset({
        name: data.name,
        type: fixtureType,
        exportName: data.exportName || '',
      });
    } catch (error) {
      toast.error('Failed to load fixture details');
      console.error(error);
      router.push(`/projects/${projectId}?tab=fixtures`);
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
      
      await fixtureService.updateFixture(projectId, fixtureId, values);
      
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
            <Button 
              variant="ghost"
              size="sm"
              asChild
              className="flex items-center gap-1"
            >
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
                      onValueChange={handleTypeChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select fixture type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="extend">Extend</SelectItem>
                        <SelectItem value="inline">Inline</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Extend fixtures extend the base test with new functionality. Inline fixtures contain inline test logic.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="exportName"
                render={({ field }: { field: ControllerRenderProps<FixtureFormValues, "exportName"> }) => (
                  <FormItem>
                    <FormLabel>Export Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter export name" 
                        {...field} 
                        onChange={(e) => {
                          field.onChange(e);
                          handleExportNameChange();
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      {shouldAutoUpdateExportName 
                        ? "Export name will be automatically updated when fixture name changes" 
                        : "Export name is manually set and won't update automatically"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="flex items-center gap-1"
                >
                  <Link href={`/projects/${projectId}/fixtures/${fixtureId}`}>
                    <ChevronLeft className="h-4 w-4" />
                    Back to Fixture
                  </Link>
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
