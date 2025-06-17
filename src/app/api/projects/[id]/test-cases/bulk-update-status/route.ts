import { NextRequest, NextResponse } from 'next/server';
import { checkResourcePermission } from '@/lib/rbac/check-permission';
import { getCurrentUserEmail } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

// PATCH /api/projects/[id]/test-cases/bulk-update-status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const userEmail = await getCurrentUserEmail();
    
    // Check permission
    const hasPermission = await checkResourcePermission('project', 'update', projectId);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { testCaseIds, status } = await request.json();
    
    if (!testCaseIds || !Array.isArray(testCaseIds) || testCaseIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected an array of test case IDs.' },
        { status: 400 }
      );
    }

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    // Update status for all test cases
    const updatedTestCases = await prisma.testCase.updateMany({
      where: {
        id: { in: testCaseIds },
        projectId: projectId // Ensure test cases belong to the project
      },
      data: {
        status,
        updatedBy: userEmail
      }
    });

    return NextResponse.json({
      message: 'Test cases updated successfully',
      count: updatedTestCases.count
    });
  } catch (error) {
    console.error('Error updating test cases:', error);
    return NextResponse.json(
      { error: 'Failed to update test cases' },
      { status: 500 }
    );
  }
} 