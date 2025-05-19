import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth/options';
import { FixtureRepository } from '@/lib/db/repositories/fixture-repository';
import { FixtureVersionRepository } from '@/lib/db/repositories/fixture-version-repository';
import { StepRepository } from '@/lib/db/repositories/step-repository';
import { checkResourcePermission } from '@/lib/rbac/check-permission';
import { getServerSession } from 'next-auth/next';
import { getCurrentUserEmail } from '@/lib/auth/session';
import { incrementVersion } from '@/lib/utils/version';
import { StepVersionRepository } from '@/lib/db/repositories/step-version-repository';
import { TestManagerService } from '@/lib/playwright/test-manager.service';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/projects/[id]/fixtures/[fixtureId]/steps
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; fixtureId: string } }
) {
  try {
    const resolvedParams = await params;
    const { id: projectId, fixtureId } = resolvedParams;
    
    // Log parameters for debugging
    console.log('GET fixture steps - params:', { projectId, fixtureId });
    
    const session = await getServerSession(authOptions);
    
    const hasPermission = await checkResourcePermission('project', 'view', projectId);
    
    if (!hasPermission) {
      return NextResponse.json({ error: 'You do not have permission to view this fixture' }, { status: 403 });
    }

    const fixtureRepository = new FixtureRepository();
    const fixture = await fixtureRepository.findById(fixtureId);
    
    if (!fixture) {
      console.log('Fixture not found with ID:', fixtureId);
      return NextResponse.json({ error: 'Fixture not found' }, { status: 404 });
    }

    // Check if fixture belongs to the project
    if (fixture.projectId !== projectId) {
      console.log('Fixture found but belongs to a different project', {
        requestedProjectId: projectId, 
        actualProjectId: fixture.projectId
      });
      return NextResponse.json({ error: 'Fixture not found in this project' }, { status: 404 });
    }

    // Get fixture with steps included
    const fixtureWithSteps = await fixtureRepository.findWithSteps(fixtureId);
    const steps = fixtureWithSteps?.steps || [];
    
    // Sort steps by order
    const sortedSteps = [...steps].sort((a, b) => a.order - b.order);
    
    return NextResponse.json(sortedSteps);
  } catch (error) {
    console.error('Error fetching fixture steps:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fixture steps' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/fixtures/[fixtureId]/steps
// Add a new step to the fixture
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; fixtureId: string } }
) {
  try {
    const resolvedParams = await params;
    const { id: projectId, fixtureId } = resolvedParams;
    const userEmail = await getCurrentUserEmail();
    
    // Check if user has permission to update fixture
    const hasPermission = await checkResourcePermission(
      'project',
      'update',
      projectId
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { action, data, expected, playwrightScript, disabled } = body;

    // Validate required fields
    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    // Get the fixture and check if it exists
    const fixtureRepository = new FixtureRepository();
    const fixtureVersionRepository = new FixtureVersionRepository();
    const stepRepository = new StepRepository();
    const fixture = await fixtureRepository.findById(fixtureId);
    
    if (!fixture) {
      return NextResponse.json({ error: 'Fixture not found' }, { status: 404 });
    }

    // Check if fixture belongs to the project
    if (fixture.projectId !== projectId) {
      return NextResponse.json(
        { error: 'Fixture not found in this project' },
        { status: 404 }
      );
    }

    // Get existing steps to determine the next order
    const fixtureWithSteps = await fixtureRepository.findWithSteps(fixtureId);
    const steps = fixtureWithSteps?.steps || [];
    
    // Calculate next order position
    const maxOrderStep = steps.length > 0 
      ? steps.reduce((max, step) => step.order > max.order ? step : max, steps[0]) 
      : null;
    const nextOrder = maxOrderStep ? maxOrderStep.order + 1 : 0;

    // Create step
    const step = await stepRepository.create({
      fixtureId,
      action,
      data,
      expected,
      playwrightScript: playwrightScript || '',
      order: nextOrder,
      disabled: disabled || false,
      createdBy: userEmail,
      updatedBy: userEmail
    });

    // Get the latest version to determine next version number
    const latestVersion = await fixtureVersionRepository.findLatestByFixtureId(fixtureId);
    let newVersionNumber = '1.0.1';
    
    if (latestVersion) {
      newVersionNumber = incrementVersion(latestVersion.version);
    }

    // Create a version for the current state of the fixture
    const newVersion = await fixtureVersionRepository.create({
      fixtureId: fixture.id,
      version: newVersionNumber,
      name: fixture.name,
      playwrightScript: fixture.playwrightScript || undefined,
      createdBy: userEmail
    });

    // Create step versions for all current steps of the fixture
    const allSteps = await stepRepository.findByFixtureId(fixtureId);
    const stepVersionRepository = new StepVersionRepository();
    for (const s of allSteps) {
      await stepVersionRepository.create({
        fixtureVersionId: newVersion.id,
        action: s.action,
        data: s.data || undefined,
        expected: s.expected || undefined,
        order: s.order,
        disabled: s.disabled || false,
        createdBy: userEmail
      });
    }

    // Update the fixture (e.g., updatedAt field)
    await fixtureRepository.update(fixtureId, {
      updatedBy: userEmail
    });

    // Regenerate the fixture file
    try {
      console.log(`Updating fixture file for fixture ID: ${fixtureId}`);
      const appRoot = process.cwd();
      
      // Get the project details
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });
      
      if (project && project.playwrightProjectPath) {
        const absoluteProjectPath = path.join(appRoot, project.playwrightProjectPath);
        const testManager = new TestManagerService(absoluteProjectPath);
        await testManager.createFixtureFile(fixtureId);
        console.log(`Fixture file updated successfully for fixture ID: ${fixtureId}`);
      } else {
        console.error('Project not found or Playwright project path is not set');
      }
    } catch (fileError) {
      console.error('Error updating fixture file:', fileError);
      // We don't fail the request if file update fails
    }

    return NextResponse.json(step, { status: 201 });
  } catch (error) {
    console.error('Error creating fixture step:', error);
    return NextResponse.json(
      { error: 'Failed to create fixture step' },
      { status: 500 }
    );
  }
} 