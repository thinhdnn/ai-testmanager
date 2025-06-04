import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { checkPermission } from "@/lib/rbac/check-permission";
import { getCurrentUserEmail } from "@/lib/auth/session";

// Get a single user by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Check if the user has permission to read users
    const hasPermission = await checkPermission("user", "manage");
    
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Unauthorized: You don't have permission to view users" },
        { status: 403 }
      );
    }

    // According to Next.js 15 docs, params must be awaited before using its properties
    const { userId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true
          }
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

// Update user by ID
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Check if the user has permission to update users
    const hasPermission = await checkPermission("user", "manage");
    const userEmail = await getCurrentUserEmail();
    
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Unauthorized: You don't have permission to update users" },
        { status: 403 }
      );
    }

    // According to Next.js 15 docs, params must be awaited before using its properties
    const { userId } = await params;
    const { username, email, roleIds } = await req.json();

    // Check if the user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if username is already taken by another user
    if (username && username !== existingUser.username) {
      const userWithSameUsername = await prisma.user.findUnique({
        where: { username },
      });

      if (userWithSameUsername) {
        return NextResponse.json(
          { error: "Username already exists" },
          { status: 409 }
        );
      }
    }

    // Update user roles if provided
    if (roleIds) {
      // Delete existing role assignments
      await prisma.userRole.deleteMany({
        where: { userId },
      });

      // Create new role assignments
      await prisma.userRole.createMany({
        data: roleIds.map((roleId: string) => ({
          userId,
          roleId,
        })),
      });
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        username,
        email,
        updatedBy: userEmail || undefined,
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    // Remove password from response
    const { password, ...userWithoutPassword } = updatedUser;

    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// Delete user by ID
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Check if the user has permission to delete users
    const hasPermission = await checkPermission("user", "manage");
    
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Unauthorized: You don't have permission to delete users" },
        { status: 403 }
      );
    }

    // According to Next.js 15 docs, params must be awaited before using its properties
    const { userId } = await params;

    // Check if the user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Delete user
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json(
      { message: "User deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
} 