import { NextRequest, NextResponse } from 'next/server';
import { checkResourcePermission } from '@/lib/rbac/check-permission';
import { getCurrentUserEmail } from '@/lib/auth/session';
import { Release, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

// GET /api/projects/[id]/releases/[releaseId]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; releaseId: string }> }
) {
  try {
    const { id: projectId, releaseId } = await params;
    
    // Check permission
    const hasPermission = await checkResourcePermission('project', 'view', projectId);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const release = await prisma.release.findUnique({
      where: { id: releaseId },
      include: {
        testCases: {
          include: {
            testCase: {
              include: {
                project: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!release) {
      return NextResponse.json({ error: 'Release not found' }, { status: 404 });
    }

    // Verify that this release belongs to the specified project
    if (release.projectId !== projectId) {
      return NextResponse.json({ error: 'Release not found in this project' }, { status: 404 });
    }

    return NextResponse.json(release);
  } catch (error) {
    console.error('Error fetching release:', error);
    return NextResponse.json(
      { error: 'Failed to fetch release' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id]/releases/[releaseId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; releaseId: string }> }
) {
  try {
    const { id: projectId, releaseId } = await params;
    const userEmail = await getCurrentUserEmail();
    
    // Check permission
    const hasPermission = await checkResourcePermission('project', 'update', projectId);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the release to verify it exists and belongs to the project
    const existingRelease = await prisma.release.findUnique({
      where: { id: releaseId },
    });

    if (!existingRelease) {
      return NextResponse.json({ error: 'Release not found' }, { status: 404 });
    }

    if (existingRelease.projectId !== projectId) {
      return NextResponse.json({ error: 'Release not found in this project' }, { status: 404 });
    }

    const body = await request.json();
    const { name, version, description, startDate, endDate, status } = body;

    // Validate required fields
    if (!name || !version || !startDate) {
      return NextResponse.json(
        { error: 'Name, version and start date are required' },
        { status: 400 }
      );
    }

    const release = await prisma.release.update({
      where: { id: releaseId },
      data: {
        name,
        version,
        description,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        status: status || existingRelease.status,
        updatedBy: userEmail,
      }
    });

    return NextResponse.json(release);
  } catch (error) {
    console.error('Error updating release:', error);
    return NextResponse.json(
      { error: 'Failed to update release' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/releases/[releaseId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; releaseId: string }> }
) {
  try {
    const { id: projectId, releaseId } = await params;
    
    // Check permission
    const hasPermission = await checkResourcePermission('project', 'update', projectId);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the release to verify it exists and belongs to the project
    const existingRelease = await prisma.release.findUnique({
      where: { id: releaseId },
    });

    if (!existingRelease) {
      return NextResponse.json({ error: 'Release not found' }, { status: 404 });
    }

    if (existingRelease.projectId !== projectId) {
      return NextResponse.json({ error: 'Release not found in this project' }, { status: 404 });
    }

    await prisma.release.delete({
      where: { id: releaseId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting release:', error);
    return NextResponse.json(
      { error: 'Failed to delete release' },
      { status: 500 }
    );
  }
} 