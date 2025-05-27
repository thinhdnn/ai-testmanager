import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from "@/lib/auth/options";
import { checkResourcePermission } from '@/lib/rbac/check-permission';
import { StepRepository } from '@/lib/db/repositories/step-repository';
import { TestCaseRepository } from '@/lib/db/repositories/test-case-repository';
import { TestCaseVersionRepository } from '@/lib/db/repositories/test-case-version-repository';
import { StepVersionRepository } from '@/lib/db/repositories/step-version-repository';
import { getCurrentUserEmail } from '@/lib/auth/session';
import { incrementVersion } from '@/lib/utils/version';
import { TestManagerService } from '@/lib/playwright/test-manager.service';
import { FixtureVersionRepository } from '@/lib/db/repositories/fixture-version-repository';
import { FixtureRepository } from '@/lib/db/repositories/fixture-repository';

// GET /api/projects/[id]/test-cases/[testCaseId]/steps/[stepId]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; testCaseId: string; stepId: string }> }
) {
  try {
    // In Next.js 15, params is a Promise that must be awaited
    const params_data = await params;
    const projectId = params_data.id;
    const stepId = params_data.stepId;

    // Check if user has permission to view test step
    const hasPermission = await checkResourcePermission(
      'project',
      'view',
      projectId
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get test step
    const stepRepository = new StepRepository();
    const step = await stepRepository.findById(stepId);

    if (!step) {
      return NextResponse.json({ error: 'Step not found' }, { status: 404 });
    }

    return NextResponse.json(step);
  } catch (error) {
    console.error('Error fetching test step:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test step' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id]/test-cases/[testCaseId]/steps/[stepId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; testCaseId: string; stepId: string }> }
) {
  try {
    // In Next.js 15, params is a Promise that must be awaited
    const params_data = await params;
    const projectId = params_data.id;
    const testCaseId = params_data.testCaseId;
    const stepId = params_data.stepId;
    
    const userEmail = await getCurrentUserEmail();

    // Check if user has permission to update test step
    const hasPermission = await checkResourcePermission(
      'project',
      'update',
      projectId
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { action, data, expected, fixtureId, disabled, order, playwrightScript } = body;

    // Update step
    const stepRepository = new StepRepository();
    const testCaseRepository = new TestCaseRepository();
    const testCaseVersionRepository = new TestCaseVersionRepository();
    const stepVersionRepository = new StepVersionRepository();
    const fixtureVersionRepository = new FixtureVersionRepository();
    const fixtureRepository = new FixtureRepository();

    const step = await stepRepository.findById(stepId);
    if (!step) {
      return NextResponse.json({ error: 'Step not found' }, { status: 404 });
    }

    const updatedStep = await stepRepository.update(stepId, {
      action: action || undefined,
      data: data || undefined,
      expected: expected || undefined,
      order: order || undefined,
      disabled: disabled,
      fixtureId: fixtureId || undefined,
      playwrightScript: playwrightScript || undefined,
      updatedBy: userEmail
    });

    // Update the test case version
    const testCase = await testCaseRepository.findById(testCaseId);

    if (testCase) {
      // Increment the version using the utility function
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
          // If the step has a fixture, ensure a fixture version exists
          let fixtureVersionId;
          if (currentStep.fixtureId) {
            const fixture = await fixtureRepository.findById(currentStep.fixtureId);
            if (fixture) {
              // Get or create latest fixture version
              let fixtureVersion = await fixtureVersionRepository.findLatestByFixtureId(currentStep.fixtureId);
              if (!fixtureVersion) {
                // Create initial fixture version if none exists
                fixtureVersion = await fixtureVersionRepository.create({
                  fixtureId: currentStep.fixtureId,
                  version: '1.0.0',
                  name: fixture.name,
                  playwrightScript: fixture.playwrightScript || undefined,
                  createdBy: userEmail
                });
              }
              fixtureVersionId = fixtureVersion.id;
            }
          }

          await stepVersionRepository.create({
            testCaseVersionId: latestVersion.id,
            fixtureVersionId: fixtureVersionId,
            action: currentStep.action,
            data: currentStep.data || undefined,
            expected: currentStep.expected || undefined,
            order: currentStep.order,
            disabled: currentStep.disabled || false,
            createdBy: userEmail
          });
        }
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

    return NextResponse.json(updatedStep);
  } catch (error) {
    console.error('Error updating test step:', error);
    return NextResponse.json(
      { error: 'Failed to update test step' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/test-cases/[testCaseId]/steps/[stepId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; testCaseId: string; stepId: string }> }
) {
  try {
    // In Next.js 15, params is a Promise that must be awaited
    const params_data = await params;
    const projectId = params_data.id;
    const testCaseId = params_data.testCaseId;
    const stepId = params_data.stepId;
    
    const userEmail = await getCurrentUserEmail();

    // Check if user has permission to delete test step
    const hasPermission = await checkResourcePermission(
      'project',
      'update',
      projectId
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete step
    const stepRepository = new StepRepository();
    const testCaseRepository = new TestCaseRepository();
    const testCaseVersionRepository = new TestCaseVersionRepository();
    const stepVersionRepository = new StepVersionRepository();
    
    const step = await stepRepository.findById(stepId);
    if (!step) {
      return NextResponse.json({ error: 'Step not found' }, { status: 404 });
    }

    // Delete the step
    await stepRepository.delete(stepId);

    // Update the test case version
    const testCase = await testCaseRepository.findById(testCaseId);

    if (testCase) {
      // Increment the version using the utility function
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
      
      // After deleting the step and reordering, get the remaining steps
      const remainingSteps = await stepRepository.findByTestCaseId(testCaseId);
      
      // Create versions for all remaining steps
      if (latestVersion && remainingSteps.length > 0) {
        for (const currentStep of remainingSteps) {
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
    }

    // Reorder remaining steps to maintain sequential ordering
    await stepRepository.reorderAfterDelete(testCaseId, step.order);

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

    return NextResponse.json({ message: 'Step deleted successfully' });
  } catch (error) {
    console.error('Error deleting test step:', error);
    return NextResponse.json(
      { error: 'Failed to delete test step' },
      { status: 500 }
    );
  }
} 