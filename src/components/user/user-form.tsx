'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { UserService } from '@/lib/api/services';

interface Role {
  id: string;
  name: string;
}

interface User {
  id: string;
  username: string;
  email: string | null;
  isActive: boolean;
  roles: {
    roleId: string;
    role: {
      id: string;
      name: string;
    }
  }[];
}

const formSchema = z.object({
  username: z.string().min(3, { message: 'Username must be at least 3 characters' }).optional(),
  email: z.string().email({ message: 'Please enter a valid email' }).optional(),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }).optional(),
  confirmPassword: z.string().optional(),
  roleIds: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
}).refine((data) => !data.password || data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof formSchema>;

interface UserFormProps {
  userId: string;
  isEditing?: boolean;
}

export function UserForm({ userId, isEditing = false }: UserFormProps) {
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const userService = new UserService();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      roleIds: [] as string[],
    },
  });

  useEffect(() => {
    async function fetchRoles() {
      try {
        const data = await userService.getRoles();
        setRoles(data.roles);
      } catch (error) {
        console.error('Error fetching roles:', error);
        toast.error('Failed to load roles');
      }
    }

    async function fetchUser() {
      try {
        setIsLoadingUser(true);
        const userData = await userService.getUser(userId);
        setUser(userData);
        
        // Set form values
        form.reset({
          email: userData.email || '',
          password: '',
          confirmPassword: '',
          roleIds: userData.roles.map((r: any) => r.roleId),
        });
      } catch (error) {
        console.error('Error fetching user:', error);
        toast.error('Failed to load user information');
        
        // Redirect to users page if user not found (404 error)
        if (error instanceof Error && error.message.includes('404')) {
          toast.error('User not found');
          router.push('/users');
        }
      } finally {
        setIsLoadingUser(false);
      }
    }

    fetchRoles();
    if (isEditing) {
      fetchUser();
    }
  }, [userId, router, form, isEditing]);

  const onSubmit = async (values: FormData) => {
    try {
      setIsLoading(true);
      
      const payload: Record<string, any> = {
        email: values.email || null,
        roleIds: values.roleIds,
      };
      
      // Only include password if it's been changed
      if (values.password) {
        payload.password = values.password;
      }
      
      if (isEditing) {
        await userService.updateUser(userId, payload);
        toast.success('User updated successfully');
      } else {
        if (!values.username) {
          toast.error('Username is required');
          return;
        }
        if (!values.password) {
          toast.error('Password is required');
          return;
        }
        await userService.createUser({
          username: values.username,
          email: values.email || null,
          password: values.password,
          roleIds: values.roleIds,
        });
        toast.success('User created successfully');
      }
      
      router.push('/users');
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save user');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingUser && isEditing) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <div className="animate-spin h-8 w-8 border-4 border-green-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  if (isEditing && !user) {
    return null;
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit User' : 'Create User'}</CardTitle>
        <CardDescription>
          {isEditing ? 'Update the user\'s details below' : 'Enter the user\'s details below'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit as SubmitHandler<FormData>)} className="space-y-8">
            {isEditing && user ? (
              <div className="p-3 border rounded-md bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  Username: <span className="font-semibold">{user.username}</span> (Cannot be changed)
                </p>
              </div>
            ) : (
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="johndoe" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter a unique username
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="john.doe@example.com" {...field} />
                  </FormControl>
                  <FormDescription>
                    Optional: Used for notifications and password recovery
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormDescription>
                      {isEditing ? 'Leave blank to keep current password' : 'Enter a password'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="roleIds"
              render={() => (
                <FormItem>
                  <FormLabel>Roles</FormLabel>
                  <div className="space-y-2">
                    {roles.map((role) => (
                      <FormField
                        key={role.id}
                        control={form.control}
                        name="roleIds"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={role.id}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(role.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value || [], role.id])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== role.id
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {role.name}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <CardFooter className="flex justify-between px-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/users')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create User'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
} 