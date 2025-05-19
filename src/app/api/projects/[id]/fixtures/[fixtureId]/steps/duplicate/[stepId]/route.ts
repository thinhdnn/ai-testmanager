import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { FixtureRepository } from '@/lib/db/repositories/fixture-repository';
import { FixtureVersionRepository } from '@/lib/db/repositories/fixture-version-repository';
import { StepRepository } from '@/lib/db/repositories/step-repository';
import { StepVersionRepository } from '@/lib/db/repositories/step-version-repository';
import { checkResourcePermission } from '@/lib/rbac/check-permission';
import { getCurrentUserEmail } from '@/lib/auth/session';
import { incrementVersion } from '@/lib/utils/version';
import { TestManagerService } from '@/lib/playwright/test-manager.service';
import path from 'path';

const prisma = new PrismaClient();

// POST /api/projects/[id]/fixtures/[fixtureId]/steps/duplicate/[stepId]
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; fixtureId: string; stepId: string } }
) {
  try {
    const paramsObj = await params;
    const { id: projectId, fixtureId, stepId } = paramsObj;
    const userEmail = await getCurrentUserEmail();
    
    // Check permission
    const hasPermission = await checkResourcePermission('project', 'update', projectId);
    
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate fixture exists and belongs to the project
    const fixtureRepository = new FixtureRepository();
    const fixture = await fixtureRepository.findById(fixtureId);
    
    if (!fixture) {
      return NextResponse.json({ error: 'Fixture not found' }, { status: 404 });
    }
    
    if (fixture.projectId !== projectId) {
      return NextResponse.json({ error: 'Fixture not found in this project' }, { status: 404 });
    }

    // Validate step exists
    const stepRepository = new StepRepository();
    const stepToDuplicate = await stepRepository.findById(stepId);
    
    if (!stepToDuplicate) {
      return NextResponse.json({ error: 'Step not found' }, { status: 404 });
    }
    
    // Ensure the step belongs to this fixture
    if (stepToDuplicate.fixtureId !== fixtureId) {
      return NextResponse.json({ error: 'Step not found in this fixture' }, { status: 404 });
    }
    
    // Get all steps to determine the order of the new step
    const steps = await stepRepository.findByFixtureId(fixtureId);
    
    // Find the maximum order to append the new step after it
    const maxOrder = steps.reduce((max, step) => Math.max(max, step.order), -1);
    const newOrder = maxOrder + 1;
    
    // Create a duplicate of the step
    const duplicatedStep = await stepRepository.create({
      fixtureId,
      action: `${stepToDuplicate.action} (Copy)`,
      data: stepToDuplicate.data || undefined,
      expected: stepToDuplicate.expected || undefined,
      playwrightScript: stepToDuplicate.playwrightScript || undefined,
      order: newOrder,
      disabled: stepToDuplicate.disabled,
      createdBy: userEmail,
      updatedBy: userEmail
    });
    
    // Create a new version for the fixture
    const fixtureVersionRepository = new FixtureVersionRepository();
    const latestVersion = await fixtureVersionRepository.findLatestByFixtureId(fixtureId);
    const newVersion = {
      version: latestVersion ? incrementVersion(latestVersion.version) : '1.0.1'
    };
    
    const fixtureVersion = await fixtureVersionRepository.create({
      fixtureId,
      version: newVersion.version,
      name: fixture.name,
      playwrightScript: fixture.playwrightScript || undefined,
      createdBy: userEmail
    });
    
    // Create step versions for all steps
    const updatedSteps = await stepRepository.findByFixtureId(fixtureId);
    const stepVersionRepository = new StepVersionRepository();
    
    for (const step of updatedSteps) {
      await stepVersionRepository.create({
        fixtureVersionId: fixtureVersion.id,
        action: step.action,
        data: step.data || undefined,
        expected: step.expected || undefined,
        order: step.order,
        disabled: step.disabled || false,
        createdBy: userEmail
      });
    }
    
    // Update the fixture
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
    
    // Return the updated steps along with the new version
    return NextResponse.json({
      steps: updatedSteps,
      version: newVersion.version
    });
  } catch (error) {
    console.error('Error duplicating fixture step:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate fixture step' },
      { status: 500 }
    );
  }
} 