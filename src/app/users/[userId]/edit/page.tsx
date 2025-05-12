"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { UserService } from "@/lib/api/services";

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
  email: z.string().email({ message: "Please enter a valid email" }).optional(),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }).optional(),
  confirmPassword: z.string().optional(),
  roleIds: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
}).refine((data) => !data.password || data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof formSchema>;

export default function EditUserPage({ params }: { params: { userId: string } }) {
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const userService = new UserService();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      roleIds: [] as string[],
      isActive: true,
    },
  });

  useEffect(() => {
    async function fetchRoles() {
      try {
        const data = await userService.getRoles();
        setRoles(data.roles);
      } catch (error) {
        console.error("Error fetching roles:", error);
        toast.error("Failed to load roles");
      }
    }

    async function fetchUser() {
      try {
        setIsLoadingUser(true);
        const userData = await userService.getUser(params.userId);
        setUser(userData);
        
        // Set form values
        form.reset({
          email: userData.email || "",
          password: "",
          confirmPassword: "",
          roleIds: userData.roles.map((r: any) => r.roleId),
          isActive: userData.isActive,
        });
      } catch (error) {
        console.error("Error fetching user:", error);
        toast.error("Failed to load user information");
        
        // Redirect to users page if user not found (404 error)
        if (error instanceof Error && error.message.includes("404")) {
          toast.error("User not found");
          router.push("/users");
        }
      } finally {
        setIsLoadingUser(false);
      }
    }

    fetchRoles();
    fetchUser();
  }, [params.userId, router, form]);

  const onSubmit = async (values: FormData) => {
    try {
      setIsLoading(true);
      
      const payload: Record<string, any> = {
        email: values.email || null,
        roleIds: values.roleIds,
        isActive: values.isActive,
      };
      
      // Only include password if it's been changed
      if (values.password) {
        payload.password = values.password;
      }
      
      await userService.updateUser(params.userId, payload);

      toast.success("User updated successfully");
      router.push("/users");
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update user");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingUser) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <div className="animate-spin h-8 w-8 border-4 border-green-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Edit User: {user.username}</h1>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Edit User Information</CardTitle>
          <CardDescription>
            Update the user's details below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit as SubmitHandler<FormData>)} className="space-y-8">
              <div className="p-3 border rounded-md bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  Username: <span className="font-semibold">{user.username}</span> (Cannot be changed)
                </p>
              </div>

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
                        Leave blank to keep current password
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

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Enable this user to allow them to log in
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <CardFooter className="flex justify-between px-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/users")}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
} 