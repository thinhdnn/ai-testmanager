import { NextRequest, NextResponse } from 'next/server';
import { TestResultRepository } from '@/lib/db/repositories/test-result-repository';

// GET /api/projects/[id]/test-cases/[testCaseId]/results
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; testCaseId: string } }
) {
  try {
    const testResultRepository = new TestResultRepository();
    const results = await testResultRepository.findByTestCaseId(params.testCaseId);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error fetching test results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test results' },
      { status: 500 }
    );
  }
} 