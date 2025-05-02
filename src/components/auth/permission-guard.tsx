"use client";

import { usePermission, useHasAnyPermission } from "@/lib/rbac/use-permission";

interface PermissionGuardProps {
  permission?: string;
  anyPermission?: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * A component that conditionally renders content based on user permissions
 */
export function PermissionGuard({ 
  permission,
  anyPermission,
  fallback = null,
  children 
}: PermissionGuardProps) {
  // Check for a single permission
  const hasPermission = permission ? usePermission(permission) : true;
  
  // Check for any of multiple permissions
  const hasAnyPermission = anyPermission ? useHasAnyPermission(anyPermission) : true;
  
  // Only render children if user has the required permissions
  if ((permission && !hasPermission) || (anyPermission && !hasAnyPermission)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
} 