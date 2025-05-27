import { NextRequest, NextResponse } from 'next/server';
import { checkResourcePermission } from '@/lib/rbac/check-permission';
import { TestCaseVersionRepository } from '@/lib/db/repositories/test-case-version-repository';
import { TestCaseRepository } from '@/lib/db/repositories/test-case-repository';

// GET /api/projects/[id]/test-cases/[testCaseId]/versions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; testCaseId: string }> }
) {
  try {
    const { id: projectId, testCaseId } = await params;
    
    // Check permission
    const hasPermission = await checkResourcePermission('project', 'view', projectId);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const testCaseRepository = new TestCaseRepository();
    const testCaseVersionRepository = new TestCaseVersionRepository();

    // Get the test case
    const testCase = await testCaseRepository.findById(testCaseId);
    if (!testCase) {
      return NextResponse.json({ error: 'Test case not found' }, { status: 404 });
    }

    // Verify that this test case belongs to the specified project
    if (testCase.projectId !== projectId) {
      return NextResponse.json({ error: 'Test case not found in this project' }, { status: 404 });
    }

    const versions = await testCaseVersionRepository.findByTestCaseId(testCaseId);
    return NextResponse.json({ versions });
  } catch (error) {
    console.error('Error fetching test case versions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test case versions' },
      { status: 500 }
    );
  }
} 