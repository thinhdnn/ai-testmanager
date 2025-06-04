'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserService } from '@/lib/api/services';

const schema = z.object({
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export function ChangePasswordForm({ userId }: { userId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: FormData) => {
    setIsLoading(true);
    try {
      await new UserService().updateUser(userId, { password: values.password });
      toast.success('Password updated successfully');
      form.reset();
    } catch (error) {
      toast.error('Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      <h2 className="text-lg font-semibold">Change Password</h2>
      <Input type="password" {...form.register('password')} placeholder="New password" />
      <Input type="password" {...form.register('confirmPassword')} placeholder="Confirm new password" />
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Change Password'}
      </Button>
    </form>
  );
} 