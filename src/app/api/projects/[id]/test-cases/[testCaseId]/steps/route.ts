import { NextRequest, NextResponse } from 'next/server';
import { checkResourcePermission } from '@/lib/rbac/check-permission';
import { StepRepository } from '@/lib/db/repositories/step-repository';
import { TestCaseRepository } from '@/lib/db/repositories/test-case-repository';
import { TestCaseVersionRepository } from '@/lib/db/repositories/test-case-version-repository';
import { StepVersionRepository } from '@/lib/db/repositories/step-version-repository';
import { FixtureVersionRepository } from '@/lib/db/repositories/fixture-version-repository';
import { FixtureRepository } from '@/lib/db/repositories/fixture-repository';
import { getCurrentUserEmail } from '@/lib/auth/session';
import { incrementVersion } from '@/lib/utils/version';
import { TestManagerService } from '@/lib/playwright/test-manager.service';
import { PrismaClient } from '@prisma/client';
import path from 'path';

const prisma = new PrismaClient();

// GET /api/projects/[id]/test-cases/[testCaseId]/steps
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; testCaseId: string }> }
) {
  try {
    const { id: projectId, testCaseId } = await params;
    const hasPermission = await checkResourcePermission('project', 'view', projectId);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const stepRepository = new StepRepository();
    const testCaseRepository = new TestCaseRepository();

    // Get the test case
    const testCase = await testCaseRepository.findById(testCaseId);
    if (!testCase) {
      return NextResponse.json({ error: 'Test case not found' }, { status: 404 });
    }

    // Verify that this test case belongs to the specified project
    if (testCase.projectId !== projectId) {
      return NextResponse.json({ error: 'Test case not found in this project' }, { status: 404 });
    }

    const steps = await stepRepository.findByTestCaseId(testCaseId);
    return NextResponse.json(steps);
  } catch (error) {
    console.error('Error fetching test case steps:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test case steps' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/test-cases/[testCaseId]/steps
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; testCaseId: string }> }
) {
  try {
    const { id: projectId, testCaseId } = await params;
    const userEmail = await getCurrentUserEmail();
    
    // Check permission
    const hasPermission = await checkResourcePermission('project', 'update', projectId);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { action, data, expected, order, disabled, fixtureId, playwrightScript } = await request.json();

    const stepRepository = new StepRepository();
    const testCaseRepository = new TestCaseRepository();
    const testCaseVersionRepository = new TestCaseVersionRepository();
    const stepVersionRepository = new StepVersionRepository();

    // Get the test case
    const testCase = await testCaseRepository.findById(testCaseId);
    if (!testCase) {
      return NextResponse.json({ error: 'Test case not found' }, { status: 404 });
    }

    // Get all existing steps to determine the next order value
    const existingSteps = await stepRepository.findByTestCaseId(testCaseId);
    const maxOrder = existingSteps.reduce((max, step) => 
      step.order > max ? step.order : max, 
      0
    );
    const nextOrder = maxOrder + 1;

    // Create the step
    const step = await stepRepository.create({
      testCaseId,
      action,
      data,
      expected,
      order: order || nextOrder, // Use provided order or calculate next order
      disabled: disabled || false,
      fixtureId,
      playwrightScript,
      createdBy: userEmail,
      updatedBy: userEmail
    });

    // Increment test case version
    const newVersion = incrementVersion(testCase.version);
    
    // Update test case with new version
    await testCaseRepository.update(testCaseId, {
      version: newVersion,
      updatedBy: userEmail
    });

    // Create a new test case version
    const latestVersion = await testCaseVersionRepository.create({
      testCaseId,
      version: newVersion,
      name: testCase.name,
      createdBy: userEmail
    });

    // Get all current steps for this test case
    const allSteps = await stepRepository.findByTestCaseId(testCaseId);

    // Create versions for all steps
    if (latestVersion) {
      for (const currentStep of allSteps) {
        await stepVersionRepository.create({
          testCaseVersionId: latestVersion.id,
          fixtureVersionId: currentStep.fixtureId || undefined,
          action: currentStep.action,
          data: currentStep.data || undefined,
          expected: currentStep.expected || undefined,
          order: currentStep.order,
          disabled: currentStep.disabled || false,
          createdBy: userEmail
        });
      }
    }

    // Generate test file if the test case is not manual
    if (testCase && !testCase.isManual) {
      try {
        console.log(`Updating test file for test case ID: ${testCaseId}`);
        const testManager = new TestManagerService(process.cwd());
        await testManager.createTestFile(testCaseId);
        console.log(`Test file updated successfully for test case ID: ${testCaseId}`);
      } catch (fileError) {
        console.error('Error updating test file:', fileError);
        // We don't fail the request if file update fails
      }
    }

    return NextResponse.json(step);
  } catch (error) {
    console.error('Error creating step:', error);
    return NextResponse.json(
      { error: 'Failed to create step' },
      { status: 500 }
    );
  }
} 