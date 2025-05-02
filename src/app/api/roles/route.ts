import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { checkPermission } from "@/lib/rbac/check-permission";

// Get all roles
export async function GET(req: NextRequest) {
  try {
    // Check if the user has permission to view roles
    const hasPermission = await checkPermission('user', 'view');
    
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Unauthorized: You don't have permission to view roles" },
        { status: 403 }
      );
    }

    // Get all roles
    const roles = await prisma.role.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({ roles });
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json(
      { error: "Failed to fetch roles" },
      { status: 500 }
    );
  }
} 