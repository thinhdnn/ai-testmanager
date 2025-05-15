import { NextRequest, NextResponse } from 'next/server';
import { TestCaseRepository } from '@/lib/db/repositories/test-case-repository';
import { checkResourcePermission } from '@/lib/rbac/check-permission';
import { getCurrentUserEmail } from '@/lib/auth/session';

// GET /api/projects/[id]/test-cases/[testCaseId]/[versionId]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; testCaseId: string; versionId: string } }
) {
  try {
    const { id: projectId, testCaseId, versionId } = params;
    
    // Check permission
    const hasPermission = await checkResourcePermission('project', 'view', projectId);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const testCaseRepository = new TestCaseRepository();
    const testCase = await testCaseRepository.findById(testCaseId);
    
    if (!testCase) {
      return NextResponse.json({ error: 'Test case not found' }, { status: 404 });
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

// PUT /api/projects/[id]/test-cases/[testCaseId]/[versionId]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; testCaseId: string; versionId: string } }
) {
  try {
    const { id: projectId, testCaseId, versionId } = params;
    const userEmail = await getCurrentUserEmail();
    
    // Check permission
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
    
    const updatedTestCase = await testCaseRepository.update(testCaseId, {
      name,
      status,
      isManual,
      tags,
      updatedBy: userEmail
    });
    
    return NextResponse.json(updatedTestCase);
  } catch (error) {
    console.error('Error updating test case:', error);
    return NextResponse.json(
      { error: 'Failed to update test case' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/test-cases/[testCaseId]/[versionId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; testCaseId: string; versionId: string } }
) {
  try {
    const { id: projectId, testCaseId, versionId } = params;
    
    // Check permission
    const hasPermission = await checkResourcePermission('project', 'update', projectId);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const testCaseRepository = new TestCaseRepository();
    const testCase = await testCaseRepository.findById(testCaseId);
    
    if (!testCase) {
      return NextResponse.json({ error: 'Test case not found' }, { status: 404 });
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