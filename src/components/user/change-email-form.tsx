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
  email: z.string().email({ message: 'Please enter a valid email' }),
});

type FormData = z.infer<typeof schema>;

export function ChangeEmailForm({ userId }: { userId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: FormData) => {
    setIsLoading(true);
    try {
      await new UserService().updateUser(userId, { email: values.email });
      toast.success('Email updated successfully');
    } catch (error) {
      toast.error('Failed to update email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      <h2 className="text-lg font-semibold">Change Email</h2>
      <Input {...form.register('email')} placeholder="New email" />
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Change Email'}
      </Button>
    </form>
  );
} 