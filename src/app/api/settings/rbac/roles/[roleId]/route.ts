import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { checkPermission } from "@/lib/rbac/check-permission";

// GET /api/settings/rbac/roles/[roleId] - Get role details
export async function GET(
  request: NextRequest,
  { params }: { params: { roleId: string } }
) {
  try {
    const roleId = params.roleId;

    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      return NextResponse.json(
        {
          success: false,
          error: "Role not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: role,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching role:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch role",
      },
      { status: 500 }
    );
  }
}

// PUT /api/settings/rbac/roles/[roleId] - Update role
export async function PUT(
  request: NextRequest,
  { params }: { params: { roleId: string } }
) {
  try {
    // Check for role management permission
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

    const roleId = params.roleId;
    const { name, permissionIds } = await request.json();

    // Check if role exists
    const existingRole = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!existingRole) {
      return NextResponse.json(
        {
          success: false,
          error: "Role not found",
        },
        { status: 404 }
      );
    }

    // Update role name if provided
    if (name) {
      // Check for name uniqueness (if changing name)
      if (name !== existingRole.name) {
        const roleWithSameName = await prisma.role.findUnique({
          where: { name },
        });

        if (roleWithSameName) {
          return NextResponse.json(
            {
              success: false,
              error: "Another role with this name already exists",
            },
            { status: 400 }
          );
        }
      }

      await prisma.role.update({
        where: { id: roleId },
        data: { name },
      });
    }

    // Update permissions if provided
    if (permissionIds) {
      // Remove existing permissions
      await prisma.rolePermission.deleteMany({
        where: { roleId },
      });

      // Add new permissions
      if (permissionIds.length > 0) {
        const rolePermissions = permissionIds.map(
          (permissionId: string) => ({
            roleId,
            permissionId,
          })
        );

        await prisma.rolePermission.createMany({
          data: rolePermissions,
        });
      }
    }

    // Get updated role
    const updatedRole = await prisma.role.findUnique({
      where: { id: roleId },
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
        data: updatedRole,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating role:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update role",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/settings/rbac/roles/[roleId] - Delete role
export async function DELETE(
  request: NextRequest,
  { params }: { params: { roleId: string } }
) {
  try {
    // Check for role management permission
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

    const roleId = params.roleId;

    // Check if role exists
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      return NextResponse.json(
        {
          success: false,
          error: "Role not found",
        },
        { status: 404 }
      );
    }

    // Delete role (this will cascade and delete associated role permissions)
    await prisma.role.delete({
      where: { id: roleId },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Role deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting role:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete role",
      },
      { status: 500 }
    );
  }
} 