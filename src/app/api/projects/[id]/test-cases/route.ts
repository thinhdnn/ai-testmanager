import { NextRequest, NextResponse } from 'next/server';
import { TestCaseRepository } from '@/lib/db/repositories/test-case-repository';
import { getCurrentUserEmail } from '@/lib/auth/session';

// GET /api/projects/[id]/test-cases
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // In Next.js 15, params is a Promise that must be awaited
    const params_data = await params;
    const projectId = params_data.id;
    
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
  { params }: { params: { id: string } }
) {
  try {
    // In Next.js 15, params is a Promise that must be awaited
    const params_data = await params;
    const projectId = params_data.id;
    
    const userEmail = await getCurrentUserEmail();
    const data = await request.json();
    
    // Validate required fields
    if (!data.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const testCaseRepository = new TestCaseRepository();
    const testCase = await testCaseRepository.create({
      name: data.name,
      status: data.status || 'pending',
      isManual: data.isManual === true,
      tags: data.tags || null,
      projectId: projectId, // Use the extracted projectId here
      createdBy: userEmail,
      updatedBy: userEmail,
    });

    return NextResponse.json(testCase, { status: 201 });
  } catch (error) {
    console.error('Error creating test case:', error);
    return NextResponse.json(
      { error: 'Failed to create test case' },
      { status: 500 }
    );
  }
} 