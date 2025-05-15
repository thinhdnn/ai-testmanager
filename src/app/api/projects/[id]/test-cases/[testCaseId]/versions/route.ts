import { NextRequest, NextResponse } from 'next/server';
import { TestCaseVersionRepository } from '@/lib/db/repositories/test-case-version-repository';

// GET /api/projects/[id]/test-cases/[testCaseId]/versions
export async function GET(
  request: NextRequest,
  context: { params: { id: string; testCaseId: string } }
) {
  try {
    // Wait for params to be available
    const params = await Promise.resolve(context.params);
    const testCaseId = params.testCaseId;
    
    if (!testCaseId) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }
    
    const testCaseVersionRepository = new TestCaseVersionRepository();
    const versions = await testCaseVersionRepository.findByTestCaseId(testCaseId);

    return NextResponse.json(versions);
  } catch (error) {
    console.error('Error fetching test case versions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test case versions' },
      { status: 500 }
    );
  }
} 