import { NextRequest, NextResponse } from 'next/server';
import { StepVersionRepository } from '@/lib/db/repositories/step-version-repository';

// GET /api/projects/[id]/test-cases/[testCaseId]/versions/[versionId]/steps
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; testCaseId: string; versionId: string }> }
) {
  try {
    const { id: projectId, testCaseId, versionId } = await params;
    const stepVersionRepository = new StepVersionRepository();
    const steps = await stepVersionRepository.findByTestCaseVersionId(versionId);

    return NextResponse.json(steps);
  } catch (error) {
    console.error('Error fetching version steps:', error);
    return NextResponse.json(
      { error: 'Failed to fetch version steps' },
      { status: 500 }
    );
  }
} 