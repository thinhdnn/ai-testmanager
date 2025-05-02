"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { usePermission } from "@/lib/rbac/use-permission";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  authOnly?: boolean;
  redirectTo?: string;
}

/**
 * A wrapper component to protect routes that require authentication or specific permissions
 */
export default function ProtectedRoute({
  children,
  requiredPermission,
  authOnly = true,
  redirectTo = "/auth/login",
}: ProtectedRouteProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const hasPermission = requiredPermission ? usePermission(requiredPermission) : true;
  const isLoading = status === "loading";
  
  useEffect(() => {
    // Wait for session to load
    if (isLoading) return;
    
    // Check if authentication is required and user is not authenticated
    if (authOnly && !session) {
      router.push(redirectTo);
      return;
    }
    
    // Check if specific permission is required and user doesn't have it
    if (requiredPermission && !hasPermission) {
      router.push("/auth/error?error=AccessDenied");
      return;
    }
  }, [session, status, router, authOnly, requiredPermission, hasPermission, redirectTo, isLoading]);
  
  // Show loading state while checking authentication
  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }
  
  // Don't render children if not authenticated or doesn't have permission
  if ((authOnly && !session) || (requiredPermission && !hasPermission)) {
    return null;
  }
  
  // User is authenticated and has required permissions
  return <>{children}</>;
} 