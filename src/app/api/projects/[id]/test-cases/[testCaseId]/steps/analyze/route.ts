import { NextRequest, NextResponse } from 'next/server';
import { checkResourcePermission } from '@/lib/rbac/check-permission';
import { StepRepository } from '@/lib/db/repositories/step-repository';
import { TestCaseRepository } from '@/lib/db/repositories/test-case-repository';
import { getCurrentUserEmail } from '@/lib/auth/session';
import { getAIService } from '@/lib/ai/ai-service';
import { TestManagerService } from '@/lib/playwright/test-manager.service';

// POST /api/projects/[id]/test-cases/[testCaseId]/steps/analyze
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; testCaseId: string }> }
) {
  try {
    const { id: projectId, testCaseId } = await params;
    
    // Check permissions
    const hasPermission = await checkResourcePermission('project', 'update', projectId);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get current user
    const userEmail = await getCurrentUserEmail();
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get repositories
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

    // Get request body
    const body = await request.json();
    const { codeLines } = body;

    if (!Array.isArray(codeLines)) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected codeLines array' },
        { status: 400 }
      );
    }

    // Clean up code lines
    const cleanCodeLines = codeLines
      .map(line => line.trim())
      .filter(line => line.length > 0);

    // Convert each line into a more descriptive format for AI
    const descriptions = cleanCodeLines.map(line => {
      // Remove 'await' and ';' for cleaner description
      const cleanLine = line.replace('await', '').replace(';', '').trim();
      return `Convert Playwright code: ${cleanLine}`;
    });

    // Get AI service
    const aiService = await getAIService();

    // Analyze steps
    const analyzedSteps = await aiService.analyzeAndGenerateMultipleTestSteps(descriptions);

    // Get current max order
    const existingSteps = await stepRepository.findByTestCaseId(testCaseId);
    const maxOrder = existingSteps.length > 0 
      ? Math.max(...existingSteps.map(step => step.order))
      : -1;

    // Create steps
    const createdSteps = await Promise.all(
      analyzedSteps.map(async (step, index) => {
        return stepRepository.create({
          testCaseId,
          action: step.action,
          data: step.data,
          expected: step.expected,
          playwrightScript: cleanCodeLines[index], // Use original code line
          order: maxOrder + 1 + index,
          createdBy: userEmail,
          updatedBy: userEmail
        });
      })
    );

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

    return NextResponse.json(createdSteps);
  } catch (error) {
    console.error('Error analyzing and creating test steps:', error);
    return NextResponse.json(
      { error: 'Failed to analyze and create test steps' },
      { status: 500 }
    );
  }
} 