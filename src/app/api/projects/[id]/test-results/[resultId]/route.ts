import { NextRequest, NextResponse } from 'next/server';
import { TestResultRepository } from '@/lib/db/repositories/test-result-repository';

// GET /api/projects/[id]/test-results/[resultId]
export async function GET(
  request: NextRequest,
  context: { params: { id: string; resultId: string } }
) {
  try {
    // Wait for params to be available
    const params = await Promise.resolve(context.params);
    const projectId = params.id;
    const resultId = params.resultId;
    
    if (!projectId || !resultId) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }
    
    const testResultRepository = new TestResultRepository();
    const result = await testResultRepository.findById(resultId);
    
    if (!result) {
      return NextResponse.json({ error: 'Test result not found' }, { status: 404 });
    }
    
    // Verify that this test result belongs to the specified project
    if (result.projectId !== projectId) {
      return NextResponse.json({ error: 'Test result not found in this project' }, { status: 404 });
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching test result:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test result' },
      { status: 500 }
    );
  }
} 