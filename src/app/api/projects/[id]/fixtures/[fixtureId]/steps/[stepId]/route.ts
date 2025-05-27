import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth/options';
import { FixtureRepository } from '@/lib/db/repositories/fixture-repository';
import { FixtureVersionRepository } from '@/lib/db/repositories/fixture-version-repository';
import { StepRepository } from '@/lib/db/repositories/step-repository';
import { StepVersionRepository } from '@/lib/db/repositories/step-version-repository';
import { checkResourcePermission } from '@/lib/rbac/check-permission';
import { getServerSession } from 'next-auth/next';
import { getCurrentUserEmail } from '@/lib/auth/session';
import { incrementVersion } from '@/lib/utils/version';
import { TestManagerService } from '@/lib/playwright/test-manager.service';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET endpoint for a specific fixture step
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fixtureId: string; stepId: string }> }
) {
  try {
    const paramsObj = await params;
    const { id: projectId, fixtureId, stepId } = paramsObj;
    
    // Check permission
    const hasPermission = await checkResourcePermission('project', 'view', projectId);
    
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

    // Get the step
    const stepRepository = new StepRepository();
    const step = await stepRepository.findById(stepId);
    
    if (!step) {
      return NextResponse.json({ error: 'Step not found' }, { status: 404 });
    }
    
    // Ensure the step belongs to this fixture
    if (step.fixtureId !== fixtureId) {
      return NextResponse.json({ error: 'Step not found in this fixture' }, { status: 404 });
    }
    
    return NextResponse.json(step);
  } catch (error) {
    console.error('Error fetching fixture step:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fixture step' },
      { status: 500 }
    );
  }
}

// PUT endpoint to update a fixture step
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fixtureId: string; stepId: string }> }
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

    // Get the step
    const stepRepository = new StepRepository();
    const step = await stepRepository.findById(stepId);
    
    if (!step) {
      return NextResponse.json({ error: 'Step not found' }, { status: 404 });
    }
    
    // Ensure the step belongs to this fixture
    if (step.fixtureId !== fixtureId) {
      return NextResponse.json({ error: 'Step not found in this fixture' }, { status: 404 });
    }
    
    // Update the step
    const body = await request.json();
    const { action, data, expected, order, disabled, playwrightScript } = body;
    
    // Validate required fields
    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }
    
    // Prepare update data
    const updateData = {
      action,
      data,
      expected,
      order,
      disabled: disabled || false,
      playwrightScript: playwrightScript || '', // Ensure playwrightScript is never undefined
      updatedBy: userEmail
    };
    
    const updatedStep = await stepRepository.update(stepId, updateData);
    
    // Create a new version for the fixture
    const fixtureVersionRepository = new FixtureVersionRepository();
    const latestVersion = await fixtureVersionRepository.findLatestByFixtureId(fixtureId);
    let newVersionNumber = '1.0.1';
    
    if (latestVersion) {
      newVersionNumber = incrementVersion(latestVersion.version);
    }
    
    const newVersion = await fixtureVersionRepository.create({
      fixtureId: fixture.id,
      version: newVersionNumber,
      name: fixture.name,
      playwrightScript: fixture.playwrightScript || undefined,
      createdBy: userEmail
    });
    
    // Create step versions for all current steps
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
    
    return NextResponse.json({ 
      step: updatedStep,
      version: newVersionNumber 
    });
  } catch (error) {
    console.error('Error updating fixture step:', error);
    return NextResponse.json(
      { error: 'Failed to update fixture step' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove a fixture step
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fixtureId: string; stepId: string }> }
) {
  try {
    const paramsObj = await params;
    const { id: projectId, fixtureId, stepId } = paramsObj;
    const userEmail = await getCurrentUserEmail();
    
    console.log('DELETE fixture step - params:', { projectId, fixtureId, stepId });
    
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

    // Get the step
    const stepRepository = new StepRepository();
    const step = await stepRepository.findById(stepId);
    
    if (!step) {
      return NextResponse.json({ error: 'Step not found' }, { status: 404 });
    }
    
    // Ensure the step belongs to this fixture
    if (step.fixtureId !== fixtureId) {
      return NextResponse.json({ error: 'Step not found in this fixture' }, { status: 404 });
    }
    
    // Delete the step
    await stepRepository.delete(stepId);
    
    // Reorder remaining steps
    await stepRepository.reorderFixtureStepsAfterDelete(fixtureId, step.order);
    
    // Create a new version for the fixture
    const fixtureVersionRepository = new FixtureVersionRepository();
    const latestVersion = await fixtureVersionRepository.findLatestByFixtureId(fixtureId);
    let newVersionNumber = '1.0.1';
    
    if (latestVersion) {
      newVersionNumber = incrementVersion(latestVersion.version);
    }
    
    const newVersion = await fixtureVersionRepository.create({
      fixtureId: fixture.id,
      version: newVersionNumber,
      name: fixture.name,
      playwrightScript: fixture.playwrightScript || undefined,
      createdBy: userEmail
    });
    
    // Create step versions for all remaining steps
    const remainingSteps = await stepRepository.findByFixtureId(fixtureId);
    const stepVersionRepository = new StepVersionRepository();
    
    for (const s of remainingSteps) {
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
      console.log(`Updating fixture file for fixture ID: ${fixtureId} after step deletion`);
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
      success: true,
      message: 'Step deleted successfully',
      version: newVersionNumber 
    });
  } catch (error) {
    console.error('Error deleting fixture step:', error);
    return NextResponse.json(
      { error: 'Failed to delete fixture step' },
      { status: 500 }
    );
  }
} 