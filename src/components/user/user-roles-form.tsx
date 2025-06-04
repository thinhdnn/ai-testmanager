'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { UserService } from '@/lib/api/services';

const schema = z.object({
  roleIds: z.array(z.string()),
});

type FormData = z.infer<typeof schema>;

export function UserRolesForm({ userId }: { userId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { roleIds: [] },
  });

  useEffect(() => {
    async function fetchRoles() {
      try {
        const data = await new UserService().getRoles();
        setRoles(data.roles);
      } catch {
        toast.error('Failed to load roles');
      }
    }
    async function fetchUserRoles() {
      try {
        const user = await new UserService().getUser(userId);
        form.setValue('roleIds', user.roles.map((r: any) => r.role.id));
      } catch {
        toast.error('Failed to load user roles');
      }
    }
    fetchRoles();
    fetchUserRoles();
  }, [userId, form]);

  const onSubmit = async (values: FormData) => {
    setIsLoading(true);
    try {
      await new UserService().updateUser(userId, { roleIds: values.roleIds });
      toast.success('Roles updated successfully');
    } catch (error) {
      toast.error('Failed to update roles');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      <h2 className="text-lg font-semibold">Manage Roles</h2>
      <div className="space-y-2">
        {roles.map((role) => (
          <label key={role.id} className="flex items-center gap-2">
            <Checkbox
              checked={form.watch('roleIds').includes(role.id)}
              onCheckedChange={(checked) => {
                const current = form.getValues('roleIds');
                if (checked) {
                  form.setValue('roleIds', [...current, role.id]);
                } else {
                  form.setValue('roleIds', current.filter((id) => id !== role.id));
                }
              }}
            />
            {role.name}
          </label>
        ))}
      </div>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Update Roles'}
      </Button>
    </form>
  );
} 