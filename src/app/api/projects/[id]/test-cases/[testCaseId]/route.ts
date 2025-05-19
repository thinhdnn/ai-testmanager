import { NextRequest, NextResponse } from 'next/server';
import { TestCaseRepository } from '@/lib/db/repositories/test-case-repository';
import { checkResourcePermission } from '@/lib/rbac/check-permission';
import { getCurrentUserEmail } from '@/lib/auth/session';
import { TestManagerService } from '@/lib/playwright/test-manager.service';
import { PrismaClient } from '@prisma/client';
import path from 'path';

const prisma = new PrismaClient();

// GET /api/projects/[id]/test-cases/[testCaseId]
export async function GET(
  request: NextRequest,
  context: { params: { id: string; testCaseId: string } }
) {
  try {
    // Wait for params to be available
    const params = await Promise.resolve(context.params);
    const projectId = params.id;
    const testCaseId = params.testCaseId;
    
    if (!projectId || !testCaseId) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }
    
    // Check permission - changed 'testcase' to 'testCase' to match RBAC system
    const hasPermission = await checkResourcePermission('project', 'view', projectId);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    
    const testCaseRepository = new TestCaseRepository();
    const testCase = await testCaseRepository.findById(testCaseId);
    
    if (!testCase) {
      return NextResponse.json({ error: 'Test case not found' }, { status: 404 });
    }
    
    // Verify that this test case belongs to the specified project
    if (testCase.projectId !== projectId) {
      return NextResponse.json({ error: 'Test case not found in this project' }, { status: 404 });
    }
    
    return NextResponse.json(testCase);
  } catch (error) {
    console.error('Error fetching test case:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test case' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id]/test-cases/[testCaseId]
export async function PUT(
  request: NextRequest,
  context: { params: { id: string; testCaseId: string } }
) {
  try {
    // Wait for params to be available
    const params = await Promise.resolve(context.params);
    const projectId = params.id;
    const testCaseId = params.testCaseId;
    
    if (!projectId || !testCaseId) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }
    
    const userEmail = await getCurrentUserEmail();
    
    // Check permission - changed 'testcase' to 'project' to use inheritance model
    const hasPermission = await checkResourcePermission('project', 'update', projectId);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const body = await request.json();
    const { name, status, isManual, tags } = body;
    
    if (!name) {
      return NextResponse.json(
        { error: 'Test case name is required' },
        { status: 400 }
      );
    }
    
    const testCaseRepository = new TestCaseRepository();
    const testCase = await testCaseRepository.findById(testCaseId);
    
    if (!testCase) {
      return NextResponse.json({ error: 'Test case not found' }, { status: 404 });
    }
    
    // Verify that this test case belongs to the specified project
    if (testCase.projectId !== projectId) {
      return NextResponse.json({ error: 'Test case not found in this project' }, { status: 404 });
    }
    
    const updatedTestCase = await testCaseRepository.update(testCaseId, {
      name,
      status,
      isManual,
      tags,
      updatedBy: userEmail
    });
    
    // If the test case is not manual, update or generate test file
    if (!updatedTestCase.isManual) {
      try {
        console.log(`Updating test file for test case ID: ${testCaseId}`);
        
        // Get project information
        const project = await prisma.project.findUnique({
          where: { id: projectId }
        });

        if (project && project.playwrightProjectPath) {
          // Convert relative path to absolute path
          const appRoot = process.cwd();
          const absoluteProjectPath = path.join(appRoot, project.playwrightProjectPath);
          const testManager = new TestManagerService(absoluteProjectPath);
          await testManager.createTestFile(testCaseId);
          console.log(`Test file updated successfully for test case ID: ${testCaseId}`);
        } else {
          console.error('Project not found or Playwright project path is not set');
        }
      } catch (fileError) {
        console.error('Error updating test file:', fileError);
        // We don't fail the request if file update fails
      }
    }
    
    return NextResponse.json(updatedTestCase);
  } catch (error) {
    console.error('Error updating test case:', error);
    return NextResponse.json(
      { error: 'Failed to update test case' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/test-cases/[testCaseId]
export async function DELETE(
  request: NextRequest,
  context: { params: { id: string; testCaseId: string } }
) {
  try {
    // Wait for params to be available
    const params = await Promise.resolve(context.params);
    const projectId = params.id;
    const testCaseId = params.testCaseId;
    
    if (!projectId || !testCaseId) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }
    
    // Check permission - changed 'testcase' to 'project' to use inheritance model
    const hasPermission = await checkResourcePermission('project', 'update', projectId);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const testCaseRepository = new TestCaseRepository();
    const testCase = await testCaseRepository.findById(testCaseId);
    
    if (!testCase) {
      return NextResponse.json({ error: 'Test case not found' }, { status: 404 });
    }
    
    // Verify that this test case belongs to the specified project
    if (testCase.projectId !== projectId) {
      return NextResponse.json({ error: 'Test case not found in this project' }, { status: 404 });
    }
    
    await testCaseRepository.delete(testCaseId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting test case:', error);
    return NextResponse.json(
      { error: 'Failed to delete test case' },
      { status: 500 }
    );
  }
} 