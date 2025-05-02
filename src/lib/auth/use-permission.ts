"use client";

import { useSession } from "next-auth/react";

/**
 * Check if the current user has permission to perform an action on a resource
 * @param action The action to check (e.g., 'update', 'delete')
 * @param resource The resource type (e.g., 'project', 'fixture')
 * @param resourceId Optional resource ID for specific permissions
 * @returns boolean indicating if the user has permission
 */
export function usePermission(action: string, resource: string, resourceId?: string): boolean {
  const { data: session } = useSession();
  
  if (!session || !session.user) {
    return false;
  }
  
  // The permission format is "resource.action"
  const permissionName = `${resource}.${action}`;
  
  // @ts-ignore - We're extending the session type in next-auth.d.ts
  return session.user.permissions?.includes(permissionName) || false;
} 