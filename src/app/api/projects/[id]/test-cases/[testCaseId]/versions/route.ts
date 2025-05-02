import { NextRequest, NextResponse } from 'next/server';
import { TestCaseVersionRepository } from '@/lib/db/repositories/test-case-version-repository';

// GET /api/projects/[id]/test-cases/[testCaseId]/versions
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; testCaseId: string } }
) {
  try {
    const testCaseVersionRepository = new TestCaseVersionRepository();
    const versions = await testCaseVersionRepository.findByTestCaseId(params.testCaseId);

    return NextResponse.json(versions);
  } catch (error) {
    console.error('Error fetching test case versions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test case versions' },
      { status: 500 }
    );
  }
} 