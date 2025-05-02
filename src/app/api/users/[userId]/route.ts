import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { checkPermission } from "@/lib/rbac/check-permission";
import { getCurrentUserEmail } from "@/lib/auth/session";

// Get a single user by ID
export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Check if the user has permission to read users
    const hasPermission = await checkPermission("user", "read");
    
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Unauthorized: You don't have permission to view users" },
        { status: 403 }
      );
    }

    const userId = params.userId;

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
  { params }: { params: { userId: string } }
) {
  try {
    // Check if the user has permission to update users
    const hasPermission = await checkPermission("user", "update");
    const userEmail = await getCurrentUserEmail();
    
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Unauthorized: You don't have permission to update users" },
        { status: 403 }
      );
    }

    const userId = params.userId;
    const data = await req.json();

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

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
        updatedBy: userEmail || undefined,
      },
      include: {
        roles: {
          include: {
            role: true
          }
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
  { params }: { params: { userId: string } }
) {
  try {
    // Check if the user has permission to delete users
    const hasPermission = await checkPermission("user", "delete");
    
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Unauthorized: You don't have permission to delete users" },
        { status: 403 }
      );
    }

    const userId = params.userId;

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