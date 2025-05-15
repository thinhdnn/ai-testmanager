import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { checkResourcePermission } from '@/lib/rbac/check-permission';
import { StepRepository } from '@/lib/db/repositories/step-repository';
import { TestCaseRepository } from '@/lib/db/repositories/test-case-repository';
import { TestCaseVersionRepository } from '@/lib/db/repositories/test-case-version-repository';
import { StepVersionRepository } from '@/lib/db/repositories/step-version-repository';
import { getCurrentUserEmail } from '@/lib/auth/session';
import { incrementVersion } from '@/lib/utils/version';

// POST /api/projects/[id]/test-cases/[testCaseId]/steps/duplicate/[stepId]
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; testCaseId: string; stepId: string } }
) {
  try {
    // In Next.js 15, params is a Promise that must be awaited
    const params_data = await params;
    const projectId = params_data.id;
    const testCaseId = params_data.testCaseId;
    const stepId = params_data.stepId;
    
    const userEmail = await getCurrentUserEmail();
    
    // Parse the request body
    const requestBody = await request.json().catch(() => ({}));
    
    // Check if user has permission to update test steps
    const hasPermission = await checkResourcePermission(
      'project',
      'update',
      projectId
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get repositories
    const stepRepository = new StepRepository();
    const testCaseRepository = new TestCaseRepository();
    const testCaseVersionRepository = new TestCaseVersionRepository();
    const stepVersionRepository = new StepVersionRepository();
    
    // Get the step to duplicate
    const stepToDuplicate = await stepRepository.findById(stepId);
    if (!stepToDuplicate) {
      return NextResponse.json({ error: 'Step not found' }, { status: 404 });
    }
    
    // Get all steps to determine the correct order for the new step
    const allSteps = await stepRepository.findByTestCaseId(testCaseId);
    const maxOrder = allSteps.reduce((max, step) => 
      step.order > max ? step.order : max, 
      0
    );
    
    // Create new step as a duplicate with next order
    // Use the data from the request if provided, otherwise use the original step data
    const newStep = await stepRepository.create({
      testCaseId,
      action: requestBody.action || stepToDuplicate.action,
      data: requestBody.data || stepToDuplicate.data || undefined,
      expected: requestBody.expected || stepToDuplicate.expected || undefined,
      fixtureId: requestBody.fixtureId || stepToDuplicate.fixtureId || undefined,
      playwrightScript: requestBody.playwrightScript || stepToDuplicate.playwrightScript || undefined,
      order: maxOrder + 1,
      disabled: stepToDuplicate.disabled,
      createdBy: userEmail || undefined,
      updatedBy: userEmail || undefined
    });
    
    // Update the test case version to indicate changes
    const testCase = await testCaseRepository.findById(testCaseId);
    if (!testCase) {
      return NextResponse.json({ error: 'Test case not found' }, { status: 404 });
    }
    
    // Increment the version
    const newVersion = await testCaseVersionRepository.incrementVersion(testCaseId, userEmail);
    
    // Update the test case with the new version
    await testCaseRepository.update(testCaseId, {
      version: newVersion.version,
      updatedBy: userEmail || undefined
    });
    
    // Get all steps after adding the new one
    const updatedSteps = await stepRepository.findByTestCaseId(testCaseId);
    
    // Create step versions for all steps (including the new duplicate)
    if (newVersion) {
      for (const step of updatedSteps) {
        await stepVersionRepository.create({
          testCaseVersionId: newVersion.id,
          fixtureVersionId: step.fixtureId || undefined,
          action: step.action,
          data: step.data || undefined,
          expected: step.expected || undefined,
          order: step.order,
          disabled: step.disabled || false,
          createdBy: userEmail || undefined
        });
      }
    }
    
    // Return the steps along with the new version
    return NextResponse.json({
      steps: updatedSteps,
      version: newVersion.version
    });
    
  } catch (error) {
    console.error('Error duplicating step:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 