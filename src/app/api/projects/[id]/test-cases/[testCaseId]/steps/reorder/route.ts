import { NextRequest, NextResponse } from 'next/server';
import { checkResourcePermission } from '@/lib/rbac/check-permission';
import { StepRepository } from '@/lib/db/repositories/step-repository';
import { TestCaseRepository } from '@/lib/db/repositories/test-case-repository';
import { TestCaseVersionRepository } from '@/lib/db/repositories/test-case-version-repository';
import { StepVersionRepository } from '@/lib/db/repositories/step-version-repository';
import { getCurrentUserEmail } from '@/lib/auth/session';
import { PrismaClient } from '@prisma/client';
import { incrementVersion } from '@/lib/utils/version';

const prisma = new PrismaClient();

// POST /api/projects/[id]/test-cases/[testCaseId]/steps/reorder
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; testCaseId: string } }
) {
  try {
    // In Next.js 15, params is a Promise that must be awaited
    const params_data = await params;
    const projectId = params_data.id;
    const testCaseId = params_data.testCaseId;
    
    const userEmail = await getCurrentUserEmail();
    
    // Check if user has permission to update test steps
    const hasPermission = await checkResourcePermission(
      'project',
      'update',
      projectId
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { stepId, newOrder } = body;

    if (stepId === undefined || newOrder === undefined) {
      return NextResponse.json(
        { error: 'StepId and newOrder are required' },
        { status: 400 }
      );
    }

    // Get repositories
    const stepRepository = new StepRepository();
    const testCaseRepository = new TestCaseRepository();
    const testCaseVersionRepository = new TestCaseVersionRepository();
    const stepVersionRepository = new StepVersionRepository();
    
    // Get the step to reorder
    const stepToMove = await stepRepository.findById(stepId);
    if (!stepToMove) {
      return NextResponse.json({ error: 'Step not found' }, { status: 404 });
    }
    
    // Get all steps for the test case
    const allSteps = await stepRepository.findByTestCaseId(testCaseId);
    if (!allSteps || allSteps.length === 0) {
      return NextResponse.json({ error: 'No steps found for this test case' }, { status: 404 });
    }
    
    // Validate the new order is within range
    if (newOrder < 0 || newOrder >= allSteps.length) {
      return NextResponse.json(
        { error: `New order must be between 0 and ${allSteps.length - 1}` },
        { status: 400 }
      );
    }
    
    // Execute the reordering
    // Get the current order of the step
    const currentOrder = stepToMove.order;
    let updatedSteps = [];
    
    // Update order for affected steps in a transaction
    updatedSteps = await prisma.$transaction(async (tx) => {
      if (newOrder > currentOrder) {
        // Moving down: decrement order for steps between current and new position
        await tx.step.updateMany({
          where: {
            testCaseId,
            order: {
              gt: currentOrder,
              lte: newOrder,
            },
          },
          data: {
            order: {
              decrement: 1,
            },
          },
        });
      } else if (newOrder < currentOrder) {
        // Moving up: increment order for steps between new and current position
        await tx.step.updateMany({
          where: {
            testCaseId,
            order: {
              gte: newOrder,
              lt: currentOrder,
            },
          },
          data: {
            order: {
              increment: 1,
            },
          },
        });
      }
      
      // Update the target step to the new order
      await tx.step.update({
        where: { id: stepId },
        data: { order: newOrder },
      });
      
      // Return all steps in their new order
      return tx.step.findMany({
        where: { testCaseId },
        orderBy: { order: 'asc' },
      });
    });
    
    // Update the test case version
    const testCase = await testCaseRepository.findById(testCaseId);
    
    if (!testCase) {
      return NextResponse.json({ error: 'Test case not found' }, { status: 404 });
    }
    
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
    
    // Create versions for all steps in their new order
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
    
    return NextResponse.json({
      steps: updatedSteps,
      version: newVersion,
      message: 'Steps reordered successfully'
    });
  } catch (error) {
    console.error('Error reordering steps:', error);
    return NextResponse.json(
      { error: 'Failed to reorder steps' },
      { status: 500 }
    );
  }
} 