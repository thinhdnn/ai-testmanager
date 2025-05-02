import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { TestCaseRepository } from '@/lib/db/repositories/test-case-repository';
import { TestCaseVersionRepository } from '@/lib/db/repositories/test-case-version-repository';
import { StepVersionRepository } from '@/lib/db/repositories/step-version-repository';
import { StepRepository } from '@/lib/db/repositories/step-repository';
import { getCurrentUserEmail } from '@/lib/auth/session';
import { incrementMinorVersion } from '@/lib/utils/version';

// POST /api/projects/[id]/test-cases/[testCaseId]/revert/[versionId]
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; testCaseId: string; versionId: string } }
) {
  try {
    const userEmail = await getCurrentUserEmail();
    
    // Verify that the test case exists and belongs to the project
    const testCase = await prisma.testCase.findFirst({
      where: {
        id: params.testCaseId,
        projectId: params.id,
      },
    });
    
    if (!testCase) {
      return NextResponse.json(
        { error: 'Test case not found or does not belong to this project' },
        { status: 404 }
      );
    }
    
    // Verify that the version exists and belongs to the test case
    const version = await prisma.testCaseVersion.findFirst({
      where: {
        id: params.versionId,
        testCaseId: params.testCaseId,
      },
      include: {
        stepVersions: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });
    
    if (!version) {
      return NextResponse.json(
        { error: 'Version not found or does not belong to this test case' },
        { status: 404 }
      );
    }
    
    // Make sure we have valid step versions to revert to
    if (!version.stepVersions || version.stepVersions.length === 0) {
      const stepVersionRepository = new StepVersionRepository();
      const stepVersions = await stepVersionRepository.findByTestCaseVersionId(version.id);
      
      if (!stepVersions || stepVersions.length === 0) {
        return NextResponse.json(
          { error: 'No steps found in this version' },
          { status: 400 }
        );
      }
      
      version.stepVersions = stepVersions;
    }
    
    console.log(`Reverting to steps from version ${version.version} with ${version.stepVersions.length} steps`);
    
    // Start a transaction to ensure all operations succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      // Calculate the next version number based on current version
      // Using the utility function to get a consistent version increment
      const newVersion = incrementMinorVersion(testCase.version);
      
      // Create a new version record before making changes
      const newTestCaseVersion = await tx.testCaseVersion.create({
        data: {
          testCaseId: params.testCaseId,
          version: newVersion,
          name: testCase.name,
          createdBy: userEmail,
        },
      });
      
      // Store original steps in the new version record 
      // (This preserves the current state before we replace it with the reverted state)
      const currentSteps = await tx.step.findMany({
        where: {
          testCaseId: params.testCaseId,
        },
        orderBy: {
          order: 'asc',
        },
      });
      
      for (const step of currentSteps) {
        await tx.stepVersion.create({
          data: {
            testCaseVersionId: newTestCaseVersion.id,
            action: step.action,
            data: step.data,
            expected: step.expected,
            order: step.order,
            disabled: step.disabled,
          },
        });
      }
      
      // Delete existing steps for the test case
      await tx.step.deleteMany({
        where: {
          testCaseId: params.testCaseId,
        },
      });
      
      // Create new steps based on the version's step versions
      const newSteps = [];
      for (const stepVersion of version.stepVersions) {
        const newStep = await tx.step.create({
          data: {
            testCaseId: params.testCaseId,
            action: stepVersion.action,
            data: stepVersion.data,
            expected: stepVersion.expected,
            order: stepVersion.order,
            disabled: stepVersion.disabled || false,
            createdBy: userEmail,
            updatedBy: userEmail,
          },
        });
        newSteps.push(newStep);
      }
      
      // Update the test case with the new version number
      const updatedTestCase = await tx.testCase.update({
        where: {
          id: params.testCaseId,
        },
        data: {
          version: newVersion,
          updatedBy: userEmail,
        },
        include: {
          Steps: {
            orderBy: {
              order: 'asc',
            },
          },
        },
      });
      
      return { 
        testCase: updatedTestCase, 
        steps: newSteps, 
        newVersion: newVersion,
        previousVersion: version.version
      };
    });
    
    return NextResponse.json({
      success: true,
      message: `Test case reverted to a new version ${result.newVersion} using steps from version ${result.previousVersion}`,
      testCase: result.testCase,
      steps: result.steps
    });
  } catch (error) {
    console.error('Error reverting test case:', error);
    return NextResponse.json(
      { error: 'Failed to revert test case' },
      { status: 500 }
    );
  }
} 