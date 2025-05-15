import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { Session } from 'next-auth';

// Extend the Session type to include error property
interface ExtendedSession extends Session {
  error?: string;
}

/**
 * Utility function to get the current user's email from the session
 * @returns The current user's email or null if not authenticated
 */
export async function getCurrentUserEmail(): Promise<string | null> {
  const session = await getServerSession(authOptions) as ExtendedSession | null;
  
  // Check if session has been invalidated
  if (session?.error) {
    console.warn('Session has been invalidated:', session.error);
    return null;
  }
  
  return session?.user?.email || null;
}

/**
 * Utility function to check if the current session is valid
 * @returns True if the session is valid, false otherwise
 */
export async function isSessionValid(): Promise<boolean> {
  const session = await getServerSession(authOptions) as ExtendedSession | null;
  
  // Session is invalid if it doesn't exist or has an error
  if (!session || session.error) {
    return false;
  }
  
  return true;
} 