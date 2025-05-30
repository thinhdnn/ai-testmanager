import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth/options";
import { prisma } from '@/lib/db/prisma';

interface RolePermission {
  permission: {
    name: string;
  }
}

interface UserRole {
  role: {
    permissions: RolePermission[];
  }
}

interface UserWithRoles {
  roles: UserRole[];
}

/**
 * Check if the current user has the required permission
 */
export async function checkPermission(resource: string, action: string): Promise<boolean> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return false;
    }
    
    // Fetch user with their roles from the database
    const user = await prisma.user.findUnique({
      where: { username: session.user.name as string },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    }) as UserWithRoles | null;

    if (!user) {
      return false;
    }

    // Check if the user has any role with the required permission
    return user.roles.some((userRole: UserRole) =>
      userRole.role.permissions.some(
        (rolePermission: RolePermission) =>
          rolePermission.permission.name === `${resource}.${action}`
      )
    );
  } catch (error) {
    console.error("Error checking permission:", error);
    return false;
  }
}

/**
 * Resource-specific permission check with simplified inheritance model.
 * All fixture and testcase permissions inherit from project permissions.
 * This eliminates the need for individual resource-specific permission assignments.
 */
export async function checkResourcePermission(
  resource: string,
  action: string,
  resourceId: string
): Promise<boolean> {
  try {
    console.log(`[RBAC] Checking permission: ${resource}.${action} for resource ID: ${resourceId}`);
    
    const session = await getServerSession(authOptions);
    
    console.log('[RBAC] Current session:', session ? {
      user: session.user?.name,
      email: session.user?.email
    } : 'No session found');
    
    if (!session || !session.user) {
      console.log('[RBAC] Permission denied: No active session');
      return false;
    }
    
    // Basic permission check for the specified resource type
    const hasPermission = await checkPermission(resource, action);
    console.log(`[RBAC] Basic permission check result for ${resource}.${action}: ${hasPermission}`);
    
    if (hasPermission) {
      console.log(`[RBAC] Permission granted: User has ${resource}.${action} permission for ${resourceId}`);
      return true;
    }
    
    // If resource is not 'project', check for inherited project permission
    if (resource !== 'project') {
      // Get the project ID associated with this resource if it's a child resource
      let projectId: string | null = null;
      
      if (resource === 'testCase') {
        const testCase = await prisma.testCase.findUnique({
          where: { id: resourceId },
          select: { projectId: true }
        });
        projectId = testCase?.projectId || null;
      } else if (resource === 'fixture') {
        const fixture = await prisma.fixture.findUnique({
          where: { id: resourceId },
          select: { projectId: true }
        });
        projectId = fixture?.projectId || null;
      } else if (resource === 'testResult') {
        const testResult = await prisma.testResultHistory.findUnique({
          where: { id: resourceId },
          select: { projectId: true }
        });
        projectId = testResult?.projectId || null;
      }
      
      if (projectId) {
        // For fixtures and test cases, check project permissions instead
        // This implements the inheritance model where project permissions apply to all sub-resources
        const projectPermission = await checkPermission('project', action);
        console.log(`[RBAC] Inherited permission check result for project.${action}: ${projectPermission}`);
        
        if (projectPermission) {
          console.log(`[RBAC] Permission granted via inheritance: User has project.${action} permission`);
          return true;
        }
      }
    }
    
    console.log(`[RBAC] Permission denied: User doesn't have ${resource}.${action} or inherited permission`);
    return false;
  } catch (error) {
    console.error("[RBAC] Error checking resource permission:", error);
    return false;
  }
}

/**
 * Middleware to protect API routes
 */
export function withPermission(permission: string) {
  return async (req: NextRequest) => {
    const [resource, action] = permission.split('.');
    const hasPermission = await checkPermission(resource, action);
    
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }
    
    // Continue to the actual handler if permission check passes
    return null;
  };
} 