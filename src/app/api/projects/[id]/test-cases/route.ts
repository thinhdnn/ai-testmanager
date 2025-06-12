import { NextRequest, NextResponse } from 'next/server';
import { checkResourcePermission } from '@/lib/rbac/check-permission';
import { TestCaseRepository } from '@/lib/db/repositories/test-case-repository';
import { TestCaseVersionRepository } from '@/lib/db/repositories/test-case-version-repository';
import { getCurrentUserEmail } from '@/lib/auth/session';
import { TestManagerService } from '@/lib/playwright/test-manager.service';
import { prisma } from '@/lib/db/prisma';
import { isAutoUseAISuggestionEnabled } from '@/lib/ai/ai-settings';
import { getAIProvider } from '@/lib/ai/ai-provider';
import path from 'path';

// GET /api/projects/[id]/test-cases
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    
    // Check permission
    const hasPermission = await checkResourcePermission('project', 'view', projectId);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const testCaseRepository = new TestCaseRepository();
    const testCases = await testCaseRepository.findByProjectId(projectId);
    return NextResponse.json(testCases);
  } catch (error) {
    console.error('Error fetching test cases:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test cases' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/test-cases
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const userEmail = await getCurrentUserEmail();
    
    // Check permission
    const hasPermission = await checkResourcePermission('project', 'update', projectId);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name, isManual, tags } = await request.json();
    
    // Check if AI suggestion is enabled and fix test case name if needed
    let finalName = name;
    try {
      const isAIEnabled = await isAutoUseAISuggestionEnabled();
      if (isAIEnabled && name && name.trim()) {
        const aiProvider = await getAIProvider();
        if (aiProvider) {
          finalName = await aiProvider.fixTestCaseName(name.trim());
          console.log(`AI fixed test case name: "${name}" -> "${finalName}"`);
        } else {
          console.warn('AI provider not configured, using original name');
          finalName = name.trim();
        }
      }
    } catch (error) {
      console.error('Error fixing test case name with AI:', error);
      // Continue with original name if AI fails
      finalName = name;
    }
    
    const testCaseRepository = new TestCaseRepository();
    const testCaseVersionRepository = new TestCaseVersionRepository();

    // Create the test case
    const testCase = await testCaseRepository.create({
      name: finalName,
      projectId,
      isManual: isManual || false,
      tags: Array.isArray(tags) ? tags.join(',') : tags,
      createdBy: userEmail,
      updatedBy: userEmail,
      version: '1.0.0'
    });

    // Create initial version with empty steps array
    await testCaseVersionRepository.create({
      testCaseId: testCase.id,
      version: testCase.version,
      name: testCase.name,
      createdBy: userEmail,
      stepVersions: {
        create: [] // Initialize with empty steps array
      }
    });

    // Create test file for automated tests if not manual
    if (!testCase.isManual) {
      try {
        console.log(`Creating test file for test case ID: ${testCase.id}`);
        
        // Get project information
        const project = await prisma.project.findUnique({
          where: { id: projectId }
        });

        if (project && project.playwrightProjectPath) {
          // Convert relative path to absolute path
          const appRoot = process.cwd();
          const absoluteProjectPath = path.join(appRoot, project.playwrightProjectPath);
          const testManager = new TestManagerService(absoluteProjectPath);
          await testManager.createTestFile(testCase.id);
          console.log(`Test file created successfully for test case ID: ${testCase.id}`);
        } else {
          console.error('Project not found or Playwright project path is not set');
        }
      } catch (fileError) {
        console.error('Error creating test file:', fileError);
        // We don't fail the request if file creation fails
        // Just log the error and continue
      }
    }

    return NextResponse.json(testCase);
  } catch (error) {
    console.error('Error creating test case:', error);
    return NextResponse.json(
      { error: 'Failed to create test case' },
      { status: 500 }
    );
  }
} 