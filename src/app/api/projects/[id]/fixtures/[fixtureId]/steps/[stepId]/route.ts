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

// GET endpoint for a specific fixture step
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; fixtureId: string; stepId: string } }
) {
  try {
    const { id: projectId, fixtureId, stepId } = params;
    
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
  { params }: { params: { id: string; fixtureId: string; stepId: string } }
) {
  try {
    const { id: projectId, fixtureId, stepId } = params;
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
    
    const updatedStep = await stepRepository.update(stepId, {
      action,
      data,
      expected,
      order,
      disabled,
      playwrightScript,
      updatedBy: userEmail
    });
    
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
  { params }: { params: { id: string; fixtureId: string; stepId: string } }
) {
  try {
    const { id: projectId, fixtureId, stepId } = params;
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