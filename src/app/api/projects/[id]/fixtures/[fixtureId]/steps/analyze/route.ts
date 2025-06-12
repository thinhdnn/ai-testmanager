import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/prisma';
import { StepRepository } from '@/lib/db/repositories/step-repository';
import { FixtureRepository } from '@/lib/db/repositories/fixture-repository';
import { getAIService } from '@/lib/ai/ai-service';
import { getCurrentUserEmail } from '@/lib/auth/session';
import { TestManagerService } from '@/lib/playwright/test-manager.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fixtureId: string }> }
) {
  try {
    // Get current user
    const userEmail = await getCurrentUserEmail();
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get project and fixture IDs from params
    const { id: projectId, fixtureId } = await params;

    // Get request body
    const body = await request.json();
    const { codeLines } = body;

    if (!Array.isArray(codeLines)) {
      return NextResponse.json(
        { error: 'codeLines must be an array' },
        { status: 400 }
      );
    }

    // Clean code lines
    const cleanCodeLines = codeLines.map(line => line.trim()).filter(line => line.length > 0);

    // Get repositories
    const stepRepository = new StepRepository();
    const fixtureRepository = new FixtureRepository();

    // Check if fixture exists and belongs to project
    const fixture = await fixtureRepository.findById(fixtureId);
    if (!fixture || fixture.projectId !== projectId) {
      return NextResponse.json(
        { error: 'Fixture not found' },
        { status: 404 }
      );
    }

    // Get AI service
    const aiService = await getAIService();
    
    // Analyze code and generate steps
    const analyzedSteps = await aiService.analyzeAndGenerateMultipleTestSteps(cleanCodeLines);

    // Get current max order
    const existingSteps = await stepRepository.findByFixtureId(fixtureId);
    const maxOrder = existingSteps.length > 0 
      ? Math.max(...existingSteps.map(step => step.order))
      : -1;

    // Create steps
    const createdSteps = await Promise.all(
      analyzedSteps.map(async (step, index) => {
        return stepRepository.create({
          fixtureId,
          action: step.action,
          data: step.data,
          expected: step.expected,
          playwrightScript: cleanCodeLines[index],
          order: maxOrder + 1 + index,
          createdBy: userEmail,
          updatedBy: userEmail
        });
      })
    );

    if (createdSteps.length === 0) {
      return NextResponse.json(
        { error: 'Failed to create any steps from the provided code' },
        { status: 400 }
      );
    }

    // Update fixture file
    try {
      console.log(`Updating fixture file for fixture ID: ${fixtureId}`);
      const testManager = new TestManagerService(process.cwd());
      await testManager.createFixtureFile(fixtureId);
      console.log(`Fixture file updated successfully for fixture ID: ${fixtureId}`);

      // Also update test files that use this fixture
      const testCases = await prisma.testCase.findMany({
        where: {
          projectId,
          steps: {
            some: {
              fixtureId
            }
          },
          isManual: false
        }
      });

      for (const testCase of testCases) {
        try {
          console.log(`Updating test file for test case ID: ${testCase.id}`);
          await testManager.createTestFile(testCase.id);
          console.log(`Test file updated successfully for test case ID: ${testCase.id}`);
        } catch (fileError) {
          console.error(`Error updating test file for test case ${testCase.id}:`, fileError);
          // Continue with next test case if one fails
        }
      }
    } catch (fileError) {
      console.error('Error updating fixture file:', fileError);
      // We don't fail the request if file update fails
    }

    return NextResponse.json(createdSteps);
  } catch (error) {
    console.error('Error analyzing fixture steps:', error);
    return NextResponse.json(
      { error: 'Failed to analyze fixture steps' },
      { status: 500 }
    );
  }
} 