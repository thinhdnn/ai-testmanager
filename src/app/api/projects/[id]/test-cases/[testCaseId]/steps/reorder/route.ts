import { NextRequest, NextResponse } from 'next/server';
import { checkResourcePermission } from '@/lib/rbac/check-permission';
import { StepRepository } from '@/lib/db/repositories/step-repository';
import { TestCaseRepository } from '@/lib/db/repositories/test-case-repository';
import { TestCaseVersionRepository } from '@/lib/db/repositories/test-case-version-repository';
import { StepVersionRepository } from '@/lib/db/repositories/step-version-repository';
import { getCurrentUserEmail } from '@/lib/auth/session';
import { PrismaClient } from '@prisma/client';
import { incrementVersion } from '@/lib/utils/version';
import { TestManagerService } from '@/lib/playwright/test-manager.service';

const prisma = new PrismaClient();

// POST /api/projects/[id]/test-cases/[testCaseId]/steps/reorder
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

    // Get the request body containing the ordered step IDs
    const { stepIds } = await request.json();
    
    if (!stepIds || !Array.isArray(stepIds) || stepIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected an array of step IDs.' },
        { status: 400 }
      );
    }

    // Get repositories
    const stepRepository = new StepRepository();
    const testCaseRepository = new TestCaseRepository();
    const testCaseVersionRepository = new TestCaseVersionRepository();
    const stepVersionRepository = new StepVersionRepository();

    // Get the test case
    const testCase = await testCaseRepository.findById(testCaseId);
    if (!testCase) {
      return NextResponse.json({ error: 'Test case not found' }, { status: 404 });
    }

    // Verify that this test case belongs to the specified project
    if (testCase.projectId !== projectId) {
      return NextResponse.json({ error: 'Test case not found in this project' }, { status: 404 });
    }

    // Get all steps to validate the provided step IDs
    const existingSteps = await stepRepository.findByTestCaseId(testCaseId);
    const existingStepIds = existingSteps.map(step => step.id);

    // Check that all provided step IDs belong to this test case
    const invalidStepIds = stepIds.filter(id => !existingStepIds.includes(id));
    if (invalidStepIds.length > 0) {
      return NextResponse.json(
        { error: `Some step IDs do not belong to this test case: ${invalidStepIds.join(', ')}` },
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

    // Create a new version for the test case
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

    // Create step versions for all steps in their new order
    if (latestVersion) {
      for (const step of updatedSteps) {
        await stepVersionRepository.create({
          testCaseVersionId: latestVersion.id,
          fixtureVersionId: step.fixtureId || undefined,
          action: step.action,
          data: step.data || undefined,
          expected: step.expected || undefined,
          order: step.order,
          disabled: step.disabled || false,
          createdBy: userEmail
        });
      }
    }

    // Generate test file if the test case is not manual
    if (!testCase.isManual) {
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

    return NextResponse.json({
      steps: updatedSteps,
      version: newVersion,
      message: 'Steps reordered successfully'
    });
  } catch (error) {
    console.error('Error reordering test case steps:', error);
    return NextResponse.json(
      { error: 'Failed to reorder test case steps' },
      { status: 500 }
    );
  }
} 