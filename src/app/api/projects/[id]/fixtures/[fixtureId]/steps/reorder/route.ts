import { NextRequest, NextResponse } from 'next/server';
import { FixtureRepository } from '@/lib/db/repositories/fixture-repository';
import { FixtureVersionRepository } from '@/lib/db/repositories/fixture-version-repository';
import { StepRepository } from '@/lib/db/repositories/step-repository';
import { StepVersionRepository } from '@/lib/db/repositories/step-version-repository';
import { checkResourcePermission } from '@/lib/rbac/check-permission';
import { getCurrentUserEmail } from '@/lib/auth/session';
import { incrementVersion } from '@/lib/utils/version';
import { TestManagerService } from '@/lib/playwright/test-manager.service';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/projects/[id]/fixtures/[fixtureId]/steps/reorder
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; fixtureId: string } }
) {
  try {
    const paramsObj = await params;
    const { id: projectId, fixtureId } = paramsObj;
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

    // Get the request body containing the ordered step IDs
    const body = await request.json();
    const { stepIds } = body;
    
    if (!stepIds || !Array.isArray(stepIds) || stepIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected an array of step IDs.' },
        { status: 400 }
      );
    }

    // Update the order of each step
    const stepRepository = new StepRepository();
    const stepVersionRepository = new StepVersionRepository();
    const fixtureVersionRepository = new FixtureVersionRepository();
    
    // Validate that all steps exist and belong to this fixture
    const existingSteps = await stepRepository.findByFixtureId(fixtureId);
    const existingStepIds = existingSteps.map(step => step.id);
    
    // Check that all provided step IDs belong to this fixture
    const invalidStepIds = stepIds.filter(id => !existingStepIds.includes(id));
    
    if (invalidStepIds.length > 0) {
      return NextResponse.json(
        { error: `Some step IDs do not belong to this fixture: ${invalidStepIds.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Update the order of each step
    const updatedSteps = [];
    for (let i = 0; i < stepIds.length; i++) {
      const stepId = stepIds[i];
      const step = await stepRepository.update(stepId, {
        order: i,
        updatedBy: userEmail
      });
      updatedSteps.push(step);
    }
    
    // Create a new fixture version
    const latestVersion = await fixtureVersionRepository.findLatestByFixtureId(fixtureId);
    let newVersion = '1.0.1';
    
    if (latestVersion) {
      newVersion = incrementVersion(latestVersion.version);
    }
    
    const fixtureVersion = await fixtureVersionRepository.create({
      fixtureId: fixtureId,
      version: newVersion,
      name: fixture.name,
      playwrightScript: fixture.playwrightScript || undefined,
      createdBy: userEmail
    });
    
    // Create step versions for all steps in their new order
    if (fixtureVersion) {
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
    
    return NextResponse.json({
      steps: updatedSteps,
      version: newVersion,
      message: 'Steps reordered successfully'
    });
  } catch (error) {
    console.error('Error reordering fixture steps:', error);
    return NextResponse.json(
      { error: 'Failed to reorder fixture steps' },
      { status: 500 }
    );
  }
} 