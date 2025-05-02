import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { checkPermission } from "@/lib/rbac/check-permission";

// GET /api/settings/rbac - Get roles and permissions
export async function GET() {
  try {
    // Get all roles with their permissions
    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    // Get all permissions
    const permissions = await prisma.permission.findMany();

    return NextResponse.json(
      {
        success: true,
        data: {
          roles,
          permissions,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching RBAC settings:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch RBAC settings",
      },
      { status: 500 }
    );
  }
}

// POST /api/settings/rbac/roles - Create a new role
export async function POST(request: NextRequest) {
  try {
    // Check for system settings permission
    const hasPermission = await checkPermission("role", "manage");
    
    if (!hasPermission) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: You don't have permission to manage roles",
        },
        { status: 403 }
      );
    }

    const { name, permissionIds } = await request.json();

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error: "Role name is required",
        },
        { status: 400 }
      );
    }

    // Check if role already exists
    const existingRole = await prisma.role.findUnique({
      where: { name },
    });

    if (existingRole) {
      return NextResponse.json(
        {
          success: false,
          error: "Role with this name already exists",
        },
        { status: 400 }
      );
    }

    // Create the new role
    const role = await prisma.role.create({
      data: {
        name,
      },
    });

    // Add permissions if provided
    if (permissionIds && permissionIds.length > 0) {
      const rolePermissions = permissionIds.map((permissionId: string) => ({
        roleId: role.id,
        permissionId,
      }));

      await prisma.rolePermission.createMany({
        data: rolePermissions,
      });
    }

    // Get the created role with permissions
    const createdRole = await prisma.role.findUnique({
      where: { id: role.id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: createdRole,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating role:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create role",
      },
      { status: 500 }
    );
  }
} 