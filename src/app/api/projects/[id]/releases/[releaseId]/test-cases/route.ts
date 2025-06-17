import { NextRequest, NextResponse } from 'next/server';
import { checkResourcePermission } from '@/lib/rbac/check-permission';
import { getCurrentUserEmail } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

// GET /api/projects/[id]/releases/[releaseId]/test-cases
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

    // Get the release to verify it exists and belongs to the project
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

    if (release.projectId !== projectId) {
      return NextResponse.json({ error: 'Release not found in this project' }, { status: 404 });
    }

    return NextResponse.json(release.testCases);
  } catch (error) {
    console.error('Error fetching release test cases:', error);
    return NextResponse.json(
      { error: 'Failed to fetch release test cases' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/releases/[releaseId]/test-cases
export async function POST(
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
    const release = await prisma.release.findUnique({
      where: { id: releaseId },
    });

    if (!release) {
      return NextResponse.json({ error: 'Release not found' }, { status: 404 });
    }

    if (release.projectId !== projectId) {
      return NextResponse.json({ error: 'Release not found in this project' }, { status: 404 });
    }

    const body = await request.json();
    const { testCaseIds } = body;

    if (!testCaseIds || !Array.isArray(testCaseIds) || testCaseIds.length === 0) {
      return NextResponse.json(
        { error: 'Test case IDs array is required' },
        { status: 400 }
      );
    }

    // Verify all test cases exist and belong to the project
    const testCases = await prisma.testCase.findMany({
      where: {
        id: { in: testCaseIds },
        projectId,
      },
    });

    if (testCases.length !== testCaseIds.length) {
      return NextResponse.json(
        { error: 'One or more test cases not found in this project' },
        { status: 404 }
      );
    }

    // Create release test cases
    const releaseTestCases = await prisma.$transaction(
      testCases.map((testCase) =>
        prisma.releaseTestCase.create({
          data: {
            releaseId,
            testCaseId: testCase.id,
            version: testCase.version,
            createdBy: userEmail,
            updatedBy: userEmail,
          },
        })
      )
    );

    return NextResponse.json(releaseTestCases);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'One or more test cases are already in this release' },
        { status: 400 }
      );
    }

    console.error('Error adding test cases to release:', error);
    return NextResponse.json(
      { error: 'Failed to add test cases to release' },
      { status: 500 }
    );
  }
} 