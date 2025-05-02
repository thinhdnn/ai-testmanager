"use client";

import { useSession } from "next-auth/react";

/**
 * Check if the current user has a specific permission
 * @param permission The permission to check
 * @returns boolean indicating if the user has permission
 */
export function usePermission(permission: string): boolean {
  const { data: session } = useSession();
  
  if (!session || !session.user) {
    return false;
  }
  
  // @ts-ignore - We're extending the session type in next-auth.d.ts
  return session.user.permissions?.includes(permission) || false;
}

/**
 * Check if the current user has any of the specified permissions
 * @param permissions Array of permissions to check
 * @returns boolean indicating if the user has any of the permissions
 */
export function useHasAnyPermission(permissions: string[]): boolean {
  const { data: session } = useSession();
  
  if (!session || !session.user) {
    return false;
  }
  
  // @ts-ignore - We're extending the session type in next-auth.d.ts
  const userPermissions = session.user.permissions || [];
  
  return permissions.some(permission => userPermissions.includes(permission));
}

/**
 * Check if the current user has a specific role
 * @param role The role to check
 * @returns boolean indicating if the user has the role
 */
export function useHasRole(role: string): boolean {
  const { data: session } = useSession();
  
  if (!session || !session.user) {
    return false;
  }
  
  // @ts-ignore - We're extending the session type in next-auth.d.ts
  return session.user.roles?.includes(role) || false;
}

/**
 * Get all permissions for the current user
 * @returns Array of permission strings
 */
export function useUserPermissions(): string[] {
  const { data: session } = useSession();
  
  if (!session || !session.user) {
    return [];
  }
  
  // @ts-ignore - We're extending the session type in next-auth.d.ts
  return session.user.permissions || [];
}

/**
 * Get all roles for the current user
 * @returns Array of role strings
 */
export function useUserRoles(): string[] {
  const { data: session } = useSession();
  
  if (!session || !session.user) {
    return [];
  }
  
  // @ts-ignore - We're extending the session type in next-auth.d.ts
  return session.user.roles || [];
} 