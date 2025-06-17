import { NextRequest, NextResponse } from 'next/server';
import { checkResourcePermission } from '@/lib/rbac/check-permission';
import { prisma } from '@/lib/db/prisma';

// DELETE /api/projects/[id]/releases/[releaseId]/test-cases/[testCaseId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; releaseId: string; testCaseId: string }> }
) {
  try {
    const { id: projectId, releaseId, testCaseId } = await params;
    
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

    // Get the test case to verify it exists and belongs to the project
    const testCase = await prisma.testCase.findUnique({
      where: { id: testCaseId },
    });

    if (!testCase) {
      return NextResponse.json({ error: 'Test case not found' }, { status: 404 });
    }

    if (testCase.projectId !== projectId) {
      return NextResponse.json({ error: 'Test case not found in this project' }, { status: 404 });
    }

    // Delete the release test case
    await prisma.releaseTestCase.delete({
      where: {
        releaseId_testCaseId: {
          releaseId,
          testCaseId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Test case is not in this release' },
        { status: 404 }
      );
    }

    console.error('Error removing test case from release:', error);
    return NextResponse.json(
      { error: 'Failed to remove test case from release' },
      { status: 500 }
    );
  }
} 