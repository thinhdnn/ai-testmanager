import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';

/**
 * Utility function to get the current user's email from the session
 * @returns The current user's email or null if not authenticated
 */
export async function getCurrentUserEmail(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.email || null;
} 