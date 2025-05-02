import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { FixtureRepository } from '@/lib/db/repositories/fixture-repository';
import { StepRepository } from '@/lib/db/repositories/step-repository';
import { checkResourcePermission } from '@/lib/rbac/check-permission';
import { getCurrentUserEmail } from '@/lib/auth/session';

// POST /api/projects/[id]/fixtures/[fixtureId]/clone
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; fixtureId: string } }
) {
  try {
    const { id: projectId, fixtureId } = params;
    const userEmail = await getCurrentUserEmail();
    
    // Check if user has permission to create fixtures
    const hasPermission = await checkResourcePermission(
      'project',
      'update',
      projectId
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const fixtureRepository = new FixtureRepository();
    const stepRepository = new StepRepository();

    // Get the source fixture
    const sourceFixture = await fixtureRepository.findById(fixtureId);
    if (!sourceFixture) {
      return NextResponse.json({ error: 'Fixture not found' }, { status: 404 });
    }

    // Verify that this fixture belongs to the specified project
    if (sourceFixture.projectId !== projectId) {
      return NextResponse.json({ error: 'Fixture not found in this project' }, { status: 404 });
    }

    // Get all steps for the source fixture
    const sourceSteps = await stepRepository.findByFixtureId(fixtureId);

    // Use a transaction to ensure all operations succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      // Create a new fixture as a clone with " - Copy" appended to the name
      const clonedFixture = await tx.fixture.create({
        data: {
          name: `${sourceFixture.name} - Copy`,
          type: sourceFixture.type,
          projectId: projectId,
          playwrightScript: sourceFixture.playwrightScript,
          filename: sourceFixture.filename,
          exportName: sourceFixture.exportName,
          fixtureFilePath: sourceFixture.fixtureFilePath,
          createdBy: userEmail || undefined,
          updatedBy: userEmail || undefined,
        },
      });

      // Clone all steps of the source fixture
      const clonedSteps = [];
      for (const step of sourceSteps) {
        const clonedStep = await tx.step.create({
          data: {
            fixtureId: clonedFixture.id,
            action: step.action,
            data: step.data,
            expected: step.expected,
            playwrightScript: step.playwrightScript,
            order: step.order,
            disabled: step.disabled,
            createdBy: userEmail || undefined,
            updatedBy: userEmail || undefined,
          },
        });
        clonedSteps.push(clonedStep);
      }

      return {
        fixture: clonedFixture,
        steps: clonedSteps,
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Fixture cloned successfully',
      fixture: result.fixture,
      steps: result.steps
    });
  } catch (error) {
    console.error('Error cloning fixture:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to clone fixture' },
      { status: 500 }
    );
  }
} 