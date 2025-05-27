import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { FixtureRepository } from '@/lib/db/repositories/fixture-repository';
import { StepRepository } from '@/lib/db/repositories/step-repository';
import { checkResourcePermission } from '@/lib/rbac/check-permission';
import { getCurrentUserEmail } from '@/lib/auth/session';
import { TestManagerService } from '@/lib/playwright/test-manager.service';
import path from 'path';

// POST /api/projects/[id]/fixtures/[fixtureId]/clone
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fixtureId: string }> }
) {
  try {
    const paramsObj = await params;
    const { id: projectId, fixtureId } = paramsObj;
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

    // Get all fixtures with similar names to check for duplicates
    const existingFixtures = await prisma.fixture.findMany({
      where: {
        projectId,
        name: {
          startsWith: sourceFixture.name
        }
      }
    });

    // Determine a unique name for the cloned fixture
    let newFixtureName = sourceFixture.name;
    let counter = 1;
    
    while (existingFixtures.some(f => f.name === newFixtureName + ` (${counter})`)) {
      counter++;
    }
    
    newFixtureName = `${sourceFixture.name} (${counter})`;
    
    // Create a new exportName based on the fixture name
    let newExportName = sourceFixture.exportName || '';
    // If export name is empty or not provided, generate from fixture name
    if (!newExportName) {
      newExportName = sourceFixture.name
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove special characters
        .replace(/\s+(.)/g, (_, c) => c.toUpperCase()) // Convert to camelCase
        .replace(/\s/g, '') // Remove spaces
        .replace(/^(.)/, (_, c) => c.toLowerCase()); // Ensure first character is lowercase
    }
    
    // Add the counter to the export name
    newExportName = `${newExportName}${counter}`;
    
    // Get all steps for the source fixture
    const sourceSteps = await stepRepository.findByFixtureId(fixtureId);

    // Use a transaction to ensure all operations succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      // Create a new fixture as a clone with the new unique name
      const clonedFixture = await tx.fixture.create({
        data: {
          name: newFixtureName,
          type: sourceFixture.type,
          projectId: projectId,
          playwrightScript: sourceFixture.playwrightScript,
          exportName: newExportName,
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

    // Generate the new fixture file with the updated name and exportName
    try {
      console.log(`Generating fixture file for cloned fixture ID: ${result.fixture.id}`);
      const appRoot = process.cwd();
      
      // Get the project details
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });
      
      if (project && project.playwrightProjectPath) {
        const absoluteProjectPath = path.join(appRoot, project.playwrightProjectPath);
        const testManager = new TestManagerService(absoluteProjectPath);
        await testManager.createFixtureFile(result.fixture.id);
        console.log(`Fixture file generated successfully for cloned fixture ID: ${result.fixture.id}`);
      } else {
        console.error('Project not found or Playwright project path is not set');
      }
    } catch (fileError) {
      console.error('Error generating fixture file:', fileError);
      // We don't fail the request if file generation fails
    }

    // Log response data for debugging
    console.log('Sending response with cloned fixture:', {
      id: result.fixture.id,
      name: result.fixture.name
    });

    return NextResponse.json({
      id: result.fixture.id,
      name: result.fixture.name,
      type: result.fixture.type,
      exportName: result.fixture.exportName,
      projectId: result.fixture.projectId,
      // Include other required fields
      message: 'Fixture cloned successfully',
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