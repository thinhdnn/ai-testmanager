import { NextRequest, NextResponse } from 'next/server';
import { TestResultRepository } from '@/lib/db/repositories/test-result-repository';

// GET /api/projects/[id]/test-cases/[testCaseId]/results
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; testCaseId: string }> }
) {
  try {
    // Wait for params to be available
    const params = await Promise.resolve(context.params);
    const testCaseId = params.testCaseId;
    
    if (!testCaseId) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }
    
    const testResultRepository = new TestResultRepository();
    const results = await testResultRepository.findByTestCaseId(testCaseId);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error fetching test results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test results' },
      { status: 500 }
    );
  }
} 