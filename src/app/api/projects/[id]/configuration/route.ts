import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";

interface ConfigurationSettings {
  [category: string]: {
    [key: string]: string;
  };
}

// Get project configuration settings
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await context.params;
    const settings = await prisma.projectSetting.findMany({
      where: { projectId },
    });

    // Group settings by category
    const configByCategory = settings.reduce((acc: ConfigurationSettings, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = {};
      }
      acc[setting.category][setting.key] = setting.value;
      return acc;
    }, {});

    return NextResponse.json(configByCategory);
  } catch (error) {
    console.error("Error fetching project configuration:", error);
    return NextResponse.json(
      { error: "Failed to fetch configuration" },
      { status: 500 }
    );
  }
}

// Update project configuration settings
export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await context.params;
    const data = await request.json() as ConfigurationSettings;

    // Validate project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Process each category and its settings
    const updates = [];
    for (const [category, settings] of Object.entries(data)) {
      for (const [key, value] of Object.entries(settings)) {
        updates.push(
          prisma.projectSetting.upsert({
            where: {
              projectId_category_key: {
                projectId,
                category,
                key,
              },
            },
            update: {
              value: String(value),
              updatedBy: session.user?.email || undefined,
            },
            create: {
              projectId,
              category,
              key,
              value: String(value),
              createdBy: session.user?.email || undefined,
              updatedBy: session.user?.email || undefined,
            },
          })
        );
      }
    }

    // Execute all updates in a transaction
    await prisma.$transaction(updates);

    return NextResponse.json({ message: "Configuration updated successfully" });
  } catch (error) {
    console.error("Error updating project configuration:", error);
    return NextResponse.json(
      { error: "Failed to update configuration" },
      { status: 500 }
    );
  }
}
