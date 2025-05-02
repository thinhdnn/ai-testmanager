import { NextRequest, NextResponse } from 'next/server';
import { checkResourcePermission } from '@/lib/rbac/check-permission';
import { StepRepository } from '@/lib/db/repositories/step-repository';
import { TestCaseRepository } from '@/lib/db/repositories/test-case-repository';
import { TestCaseVersionRepository } from '@/lib/db/repositories/test-case-version-repository';
import { StepVersionRepository } from '@/lib/db/repositories/step-version-repository';
import { FixtureVersionRepository } from '@/lib/db/repositories/fixture-version-repository';
import { getCurrentUserEmail } from '@/lib/auth/session';
import { incrementVersion } from '@/lib/utils/version';

// GET /api/projects/[id]/test-cases/[testCaseId]/steps
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string; testCaseId: string } }
) {
  try {
    const { projectId, testCaseId } = params;

    // Check if user has permission to view test steps
    const hasPermission = await checkResourcePermission(
      'testcase',
      'view',
      projectId
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get test steps
    const stepRepository = new StepRepository();
    const steps = await stepRepository.findByTestCaseId(testCaseId);

    return NextResponse.json(steps);
  } catch (error) {
    console.error('Error fetching test steps:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test steps' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/test-cases/[testCaseId]/steps
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string; testCaseId: string } }
) {
  try {
    const { projectId, testCaseId } = params;
    const userEmail = await getCurrentUserEmail();
    
    // Check if user has permission to update test steps
    const hasPermission = await checkResourcePermission(
      'testcase',
      'update',
      projectId
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { action, data, expected, fixtureId, playwrightScript } = body;

    // Validate required fields
    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    // Get the highest order number to append this step
    const stepRepository = new StepRepository();
    const testCaseRepository = new TestCaseRepository();
    const testCaseVersionRepository = new TestCaseVersionRepository();
    const stepVersionRepository = new StepVersionRepository();
    const fixtureVersionRepository = new FixtureVersionRepository();
    
    const steps = await stepRepository.findByTestCaseId(testCaseId);
    const maxOrderStep = steps.length > 0 ? steps.reduce((max, step) => step.order > max.order ? step : max, steps[0]) : null;
    const nextOrder = maxOrderStep ? maxOrderStep.order + 1 : 0;

    // Create step
    const step = await stepRepository.create({
      testCaseId,
      action,
      data,
      expected,
      fixtureId,
      playwrightScript,
      order: nextOrder,
      createdBy: userEmail,
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

      // Get all steps including the new one
      const allSteps = await stepRepository.findByTestCaseId(testCaseId);
      
      // Create step versions for ALL steps, not just the new one
      if (latestVersion) {
        for (const existingStep of allSteps) {
          // If this step references a fixture, find the latest fixture version
          let fixtureVersionId = undefined;
          if (existingStep.fixtureId) {
            try {
              const latestFixtureVersion = await fixtureVersionRepository.findLatestByFixtureId(existingStep.fixtureId);
              if (latestFixtureVersion) {
                fixtureVersionId = latestFixtureVersion.id;
              } else {
                console.warn(`No fixture version found for fixture ID: ${existingStep.fixtureId}`);
              }
            } catch (error) {
              console.error(`Error fetching fixture version for fixture ID: ${existingStep.fixtureId}`, error);
            }
          }
          
          await stepVersionRepository.create({
            testCaseVersionId: latestVersion.id,
            fixtureVersionId: fixtureVersionId,
            action: existingStep.action,
            data: existingStep.data || undefined,
            expected: existingStep.expected || undefined,
            order: existingStep.order,
            disabled: existingStep.disabled || false,
            createdBy: userEmail
          });
        }
      }
    }

    return NextResponse.json({ 
      step,
      version: testCase ? incrementVersion(testCase.version) : undefined 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating test step:', error);
    return NextResponse.json(
      { error: 'Failed to create test step' },
      { status: 500 }
    );
  }
} 