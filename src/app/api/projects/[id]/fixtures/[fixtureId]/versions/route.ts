import { NextRequest, NextResponse } from 'next/server';
import { FixtureVersionRepository } from '@/lib/db/repositories/fixture-version-repository';
import { StepVersionRepository } from '@/lib/db/repositories/step-version-repository';
import { checkResourcePermission } from '@/lib/rbac/check-permission';

// GET /api/projects/[id]/fixtures/[fixtureId]/versions
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; fixtureId: string } }
) {
  try {
    const { id: projectId, fixtureId } = params;
    
    // Check permission
    const hasPermission = await checkResourcePermission('project', 'view', projectId);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const fixtureVersionRepository = new FixtureVersionRepository();
    const stepVersionRepository = new StepVersionRepository();
    const versions = await fixtureVersionRepository.findByFixtureId(fixtureId);

    // For each version, fetch its stepVersions
    const versionsWithSteps = await Promise.all(
      versions.map(async (version) => {
        const stepVersions = await stepVersionRepository.findByFixtureVersionId(version.id);
        return { ...version, stepVersions };
      })
    );

    return NextResponse.json(versionsWithSteps);
  } catch (error) {
    console.error('Error fetching fixture versions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fixture versions' },
      { status: 500 }
    );
  }
} 