import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth/options';
import { getServerSession } from 'next-auth/next';
import { checkResourcePermission } from '@/lib/rbac/check-permission';

import { StepVersionRepository } from '@/lib/db/repositories/step-version-repository';
import { FixtureVersionRepository } from '@/lib/db/repositories/fixture-version-repository';

const stepVersionRepository = new StepVersionRepository();
const fixtureVersionRepository = new FixtureVersionRepository();

/**
 * @swagger
 * /api/projects/{id}/fixtures/{fixtureId}/versions/{versionId}/steps:
 *   get:
 *     description: Get steps for a specific fixture version
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Project ID
 *         required: true
 *         schema:
 *           type: string
 *       - name: fixtureId
 *         in: path
 *         description: Fixture ID
 *         required: true
 *         schema:
 *           type: string
 *       - name: versionId
 *         in: path
 *         description: Fixture Version ID
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Steps retrieved successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Version not found
 */
export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: { id: string; fixtureId: string; versionId: string };
  }
) {
  const { id: projectId, fixtureId, versionId } = params;

  try {
    // Check if user has permission to view the project
    const hasPermission = await checkResourcePermission('project', 'view', projectId);
    
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if the fixture version exists
    const fixtureVersion = await fixtureVersionRepository.findById(versionId);
    if (!fixtureVersion) {
      return NextResponse.json(
        { error: 'Fixture version not found' },
        { status: 404 }
      );
    }

    // Verify the version belongs to the specified fixture
    if (fixtureVersion.fixtureId !== fixtureId) {
      return NextResponse.json(
        { error: 'Fixture version not found for this fixture' },
        { status: 404 }
      );
    }

    // Get steps for the fixture version
    const steps = await stepVersionRepository.findByFixtureVersionId(versionId);

    return NextResponse.json(steps);
  } catch (error) {
    console.error('Error fetching fixture version steps:', error);
    return NextResponse.json(
      { error: 'Failed to fetch steps' },
      { status: 500 }
    );
  }
} 