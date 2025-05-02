import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/options";

// Create a new user
export async function POST(req: NextRequest) {
  try {
    // Check if the user has permission to create users
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.permissions?.includes("user.create")) {
      return NextResponse.json(
        { error: "Unauthorized: You don't have permission to create users" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { username, email, password, roleIds } = body;

    // Validate required fields
    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Check if username is already taken
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 409 }
      );
    }

    // Hash the password
    const hashedPassword = await hash(password, 10);

    // Create the user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        isActive: true,
        createdBy: session.user.id,
        roles: roleIds ? {
          createMany: {
            data: roleIds.map((roleId: string) => ({
              roleId,
            })),
          },
        } : undefined,
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
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}

// Get all users (with pagination, sorting, filtering, and search)
export async function GET(req: NextRequest) {
  try {
    // Check if the user has permission to view users
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.permissions?.includes("user.view")) {
      return NextResponse.json(
        { error: "Unauthorized: You don't have permission to view users" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const skip = parseInt(searchParams.get("skip") || "0", 10);
    const take = parseInt(searchParams.get("take") || "10", 10);
    const sortBy = searchParams.get("sortBy") || "username";
    const sortDirection = searchParams.get("sortDirection") || "asc";
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // Build where conditions for filtering
    const where: any = {};

    // Apply status filter
    if (status === "active") {
      where.isActive = true;
    } else if (status === "inactive") {
      where.isActive = false;
    }

    // Apply search
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get users with pagination, sorting, and filtering
    const users = await prisma.user.findMany({
      where,
      skip,
      take,
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: {
        [sortBy]: sortDirection,
      },
    });

    // Remove passwords from response
    const usersWithoutPasswords = users.map((user) => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    // Get total count for pagination
    const total = await prisma.user.count({ where });

    return NextResponse.json({
      users: usersWithoutPasswords,
      total,
      skip,
      take,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}