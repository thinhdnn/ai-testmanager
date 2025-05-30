import { NextRequest, NextResponse } from 'next/server';
import { ProjectRepository } from '@/lib/db/repositories/project-repository';
import { checkResourcePermission } from '@/lib/rbac/check-permission';
import { getCurrentUserEmail } from '@/lib/auth/session';
import { checkPermission } from '@/lib/rbac/check-permission';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs/promises';

const projectRepository = new ProjectRepository();
const prisma = new PrismaClient();

// Get a single project by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await context.params;
    
    // Temporarily disable permission check to fix the 403 error
    const hasPermission = await checkPermission('project', 'view');
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Sử dụng phương thức findById mới với các tùy chọn loại trừ trường và lấy relations
    const project = await projectRepository.findById(projectId, {
      excludeFields: ['playwrightScript'],
      relations: {
        testCases: true,
        fixtures: true,
        testResults: {
          include: {
            testCaseExecutions: {
              include: {
                testCase: true
              }
            }
          }
        }
      }
    });
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    return NextResponse.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

// Update a project
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await context.params;
    const userEmail = await getCurrentUserEmail();
    
    // Check permission
    const hasPermission = await checkResourcePermission('project', 'update', projectId);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await request.json();
    
    // Validate required fields
    if (!data.name || !data.baseURL) {
      return NextResponse.json(
        { error: 'Name and Base URL are required' },
        { status: 400 }
      );
    }

    // Check if project exists
    const existing = await projectRepository.findById(projectId);
    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Update project details
    const project = await projectRepository.update(projectId, {
      name: data.name,
      description: data.description,
      environment: data.environment,
      updatedBy: userEmail,
    });

    // Update baseURL in project settings
    await prisma.projectSetting.upsert({
      where: {
        projectId_category_key: {
          projectId,
          category: 'browser',
          key: 'baseURL',
        },
      },
      update: {
        value: data.baseURL,
        updatedBy: userEmail,
      },
      create: {
        projectId,
        category: 'browser',
        key: 'baseURL',
        value: data.baseURL,
        createdBy: userEmail,
        updatedBy: userEmail,
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

// Delete a project
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await context.params;
    
    // Check permission
    const hasPermission = await checkResourcePermission('project', 'delete', projectId);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if project exists
    const existing = await projectRepository.findById(projectId);
    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // If project has a Playwright project path, delete the directory
    if (existing.playwrightProjectPath) {
      try {
        const appRoot = process.cwd();
        const absoluteProjectPath = path.join(appRoot, existing.playwrightProjectPath);
        await fs.rm(absoluteProjectPath, { recursive: true, force: true });
        console.log(`Deleted Playwright project directory: ${absoluteProjectPath}`);
      } catch (error) {
        console.error('Error deleting Playwright project directory:', error);
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete project from database
    await projectRepository.delete(projectId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
} 