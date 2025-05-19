import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { TestCaseRepository } from '@/lib/db/repositories/test-case-repository';
import { StepRepository } from '@/lib/db/repositories/step-repository';
import { checkResourcePermission } from '@/lib/rbac/check-permission';
import { getCurrentUserEmail } from '@/lib/auth/session';
import { TestManagerService } from '@/lib/playwright/test-manager.service';
import * as path from 'path';

// Function to generate a unique test case name
async function generateUniqueTestCaseName(baseName: string, projectId: string): Promise<string> {
  let counter = 1;
  let newName = `${baseName} - Copy`;
  
  while (true) {
    const existingTestCase = await prisma.testCase.findFirst({
      where: {
        name: newName,
        projectId: projectId
      }
    });

    if (!existingTestCase) {
      break;
    }

    newName = `${baseName} - Copy ${counter}`;
    counter++;
  }

  return newName;
}

// POST /api/projects/[id]/test-cases/[testCaseId]/clone
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; testCaseId: string } }
) {
  try {
    const resolvedParams = await params;
    const { id: projectId, testCaseId } = resolvedParams;
    const userEmail = await getCurrentUserEmail();
    
    // Check if user has permission to create test cases
    const hasPermission = await checkResourcePermission(
      'project',
      'update',
      projectId
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const testCaseRepository = new TestCaseRepository();
    const stepRepository = new StepRepository();

    // Get the source test case
    const sourceTestCase = await testCaseRepository.findById(testCaseId);
    if (!sourceTestCase) {
      return NextResponse.json({ error: 'Test case not found' }, { status: 404 });
    }

    // Verify that this test case belongs to the specified project
    if (sourceTestCase.projectId !== projectId) {
      return NextResponse.json({ error: 'Test case not found in this project' }, { status: 404 });
    }

    // Get project information for TestManagerService
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project || !project.playwrightProjectPath) {
      return NextResponse.json({ error: 'Project configuration not found' }, { status: 404 });
    }

    // Get all steps for the source test case with their fixtures
    const sourceSteps = await prisma.step.findMany({
      where: { testCaseId },
      include: { fixture: true },
      orderBy: { order: 'asc' }
    });

    // Keep track of cloned fixtures to avoid duplicating the same fixture
    const fixtureCloneMap = new Map();

    // Use a transaction to ensure all operations succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      // Generate a unique name for the cloned test case
      const clonedName = await generateUniqueTestCaseName(sourceTestCase.name, projectId);

      // Create a new test case as a clone
      const clonedTestCase = await tx.testCase.create({
        data: {
          name: clonedName,
          status: sourceTestCase.status,
          isManual: sourceTestCase.isManual,
          tags: sourceTestCase.tags,
          version: "1.0",
          projectId: projectId,
          createdBy: userEmail || undefined,
          updatedBy: userEmail || undefined,
        },
      });

      // Clone all steps of the source test case
      const clonedSteps = [];
      for (const step of sourceSteps) {
        // Handle fixture cloning if the step has a fixture
        let fixtureId = undefined;
        
        if (step.fixtureId) {
          // Check if we've already cloned this fixture
          if (fixtureCloneMap.has(step.fixtureId)) {
            fixtureId = fixtureCloneMap.get(step.fixtureId);
          } else if (step.fixture) {
            // Create a clone of the fixture
            const clonedFixture = await tx.fixture.create({
              data: {
                projectId,
                name: `${step.fixture.name} - Clone`,
                type: step.fixture.type,
                playwrightScript: step.fixture.playwrightScript,
                filename: step.fixture.filename,
                exportName: step.fixture.exportName,
                fixtureFilePath: step.fixture.fixtureFilePath,
                createdBy: userEmail || undefined,
                updatedBy: userEmail || undefined,
              }
            });
            
            // Save the mapping for future reference
            fixtureId = clonedFixture.id;
            fixtureCloneMap.set(step.fixtureId, fixtureId);
          }
        }
        
        // Create the step with the cloned fixture reference
        const clonedStep = await tx.step.create({
          data: {
            testCaseId: clonedTestCase.id,
            action: step.action,
            data: step.data,
            expected: step.expected,
            fixtureId: fixtureId,
            playwrightScript: step.playwrightScript,
            order: step.order,
            disabled: step.disabled,
            createdBy: userEmail || undefined,
            updatedBy: userEmail || undefined,
          },
        });
        
        clonedSteps.push(clonedStep);
      }

      return {
        testCase: clonedTestCase,
        steps: clonedSteps,
      };
    });

    // Generate test file for the cloned test case
    const appRoot = process.cwd();
    const absoluteProjectPath = path.join(appRoot, project.playwrightProjectPath);
    const testManagerService = new TestManagerService(absoluteProjectPath);
    await testManagerService.createTestFile(result.testCase.id);

    return NextResponse.json({
      success: true,
      message: 'Test case cloned successfully',
      testCase: result.testCase,
      steps: result.steps
    });
  } catch (error) {
    console.error('Error cloning test case:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to clone test case' },
      { status: 500 }
    );
  }
} 