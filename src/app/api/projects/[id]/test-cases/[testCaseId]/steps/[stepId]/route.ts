import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from "@/lib/auth/options";
import { checkResourcePermission } from '@/lib/rbac/check-permission';
import { StepRepository } from '@/lib/db/repositories/step-repository';
import { TestCaseRepository } from '@/lib/db/repositories/test-case-repository';
import { TestCaseVersionRepository } from '@/lib/db/repositories/test-case-version-repository';
import { StepVersionRepository } from '@/lib/db/repositories/step-version-repository';
import { getCurrentUserEmail } from '@/lib/auth/session';
import { incrementVersion } from '@/lib/utils/version';

// GET /api/projects/[id]/test-cases/[testCaseId]/steps/[stepId]
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string; testCaseId: string; stepId: string } }
) {
  try {
    const { projectId, stepId } = params;

    // Check if user has permission to view test step
    const hasPermission = await checkResourcePermission(
      'testcase',
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
  { params }: { params: { projectId: string; testCaseId: string; stepId: string } }
) {
  try {
    const { projectId, testCaseId, stepId } = params;
    const userEmail = await getCurrentUserEmail();

    // Check if user has permission to update test step
    const hasPermission = await checkResourcePermission(
      'testcase',
      'update',
      projectId
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { action, data, expected, fixtureId } = body;

    // Validate required fields
    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    // Update step
    const stepRepository = new StepRepository();
    const testCaseRepository = new TestCaseRepository();
    const testCaseVersionRepository = new TestCaseVersionRepository();
    const stepVersionRepository = new StepVersionRepository();

    const step = await stepRepository.findById(stepId);
    if (!step) {
      return NextResponse.json({ error: 'Step not found' }, { status: 404 });
    }

    const updatedStep = await stepRepository.update(stepId, {
      action,
      data,
      expected,
      fixtureId,
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
  { params }: { params: { projectId: string; testCaseId: string; stepId: string } }
) {
  try {
    const { projectId, testCaseId, stepId } = params;
    const userEmail = await getCurrentUserEmail();

    // Check if user has permission to delete test step
    const hasPermission = await checkResourcePermission(
      'testcase',
      'delete',
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

    return NextResponse.json({ message: 'Step deleted successfully' });
  } catch (error) {
    console.error('Error deleting test step:', error);
    return NextResponse.json(
      { error: 'Failed to delete test step' },
      { status: 500 }
    );
  }
} 