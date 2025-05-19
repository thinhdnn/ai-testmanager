'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
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
import { ChevronLeft, Loader2, FileCode } from 'lucide-react';
import { toCamelCase, toValidFileName } from '@/lib/utils/string-utils';

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

export default function NewFixturePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [projectExists, setProjectExists] = useState(false);
  
  // Check if project exists
  useEffect(() => {
    async function checkProjectExists() {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/projects/${projectId}`);
        
        if (!response.ok) {
          // If project doesn't exist, set state to indicate this
          setProjectExists(false);
        } else {
          setProjectExists(true);
        }
      } catch (error) {
        console.error("Failed to check project:", error);
        setProjectExists(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkProjectExists();
  }, [projectId]);
  
  // If project doesn't exist and we're not loading, use Next.js notFound
  if (!isLoading && !projectExists) {
    notFound();
  }
  
  // Initialize form with default values
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
        // Auto-generate exportName in camelCase
        form.setValue('exportName', toCamelCase(value.name));
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);
  
  // Update type
  const handleTypeChange = (value: 'extend' | 'inline') => {
    form.setValue('type', value);
  };
  
  const onSubmit = async (values: FixtureFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Ensure exportName is correctly generated from name before submitting
      values.exportName = toCamelCase(values.name);
      
      // Log request payload for debugging
      console.log('Creating fixture with data:', { 
        projectId, 
        name: values.name,
        exportName: values.exportName,
        type: values.type
      });
      
      const response = await fetch(`/api/projects/${projectId}/fixtures`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to create fixture');
      }
      
      // Log created fixture for debugging
      console.log('Fixture created successfully:', responseData);
      
      toast.success('Fixture created successfully');
      
      // Kiểm tra xem response có chứa fixture hợp lệ không
      if (!responseData || !responseData.id) {
        console.error('Invalid fixture data returned', responseData);
        toast.error('Invalid fixture data returned');
        setIsSubmitting(false);
        return;
      }
      
      // Verify fixture exists before navigating
      try {
        const verifyResponse = await fetch(`/api/projects/${projectId}/fixtures/${responseData.id}?versions=true`);
        
        if (!verifyResponse.ok) {
          const verifyErrorData = await verifyResponse.json();
          console.error('Created fixture verification failed:', {
            status: verifyResponse.status,
            error: verifyErrorData
          });
          
          if (verifyResponse.status === 403) {
            toast.warning('Fixture created but you may not have permission to view it');
          } else {
            toast.error('Created fixture could not be verified');
          }
          
          // Redirect to fixtures list regardless
          router.push(`/projects/${projectId}?tab=fixtures`);
          return;
        }
        
        const verifiedFixture = await verifyResponse.json();
        console.log('Fixture verified successfully:', verifiedFixture);
        
        // Wait a moment to ensure database consistency before navigation
        setTimeout(() => {
          router.push(`/projects/${projectId}/fixtures/${responseData.id}`);
        }, 1000);
      } catch (verifyError) {
        console.error('Error verifying fixture:', verifyError);
        toast.error('Error verifying fixture');
        router.push(`/projects/${projectId}?tab=fixtures`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred while creating fixture');
      console.error('Error creating fixture:', error);
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <div className="animate-spin h-8 w-8 border-4 border-green-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }
  
  return (
    <div className="container max-w-3xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5" />
            Create New Fixture
          </CardTitle>
          <div className="text-sm text-muted-foreground mt-1" id="exportNamePreview">
            {form.watch('name') && (
              <>Export name will be automatically generated as: <span className="font-mono bg-muted px-1 py-0.5 rounded">{toCamelCase(form.watch('name'))}</span></>
            )}
          </div>
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
                render={({ field }) => (
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
              
              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/projects/${projectId}?tab=fixtures`)}
                >
                  Close
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? 'Creating...' : 'Create Fixture'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
