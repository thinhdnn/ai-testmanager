import { NextRequest, NextResponse } from 'next/server';
import { ProjectRepository } from '@/lib/db/repositories/project-repository';
import { getCurrentUserEmail } from '@/lib/auth/session';
import { TestManagerService } from '@/lib/playwright/test-manager.service';
import { CreateProjectRequest, ProjectListResponse } from '@/types';
import { prisma } from '@/lib/prisma';

// GET /api/projects
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    
    // Support both pagination methods
    const pageParam = url.searchParams.get('page');
    const limitParam = url.searchParams.get('limit');
    const skipParam = url.searchParams.get('skip');
    const takeParam = url.searchParams.get('take');
    const search = url.searchParams.get('search');

    // Default values
    let skip = 0;
    let take = 10;
    
    // If page/limit params are provided, use those
    if (pageParam && limitParam) {
      const page = parseInt(pageParam);
      const limit = parseInt(limitParam);
      skip = (page - 1) * limit;
      take = limit;
    } 
    // Otherwise use skip/take if provided
    else {
      skip = skipParam ? parseInt(skipParam) : 0;
      take = takeParam ? parseInt(takeParam) : 10;
    }

    const projectRepository = new ProjectRepository();
    
    // Build query
    let where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const projects = await projectRepository.findAll({
      skip,
      take,
      orderBy: { updatedAt: 'desc' },
      where
    });

    const total = await projectRepository.count(where);
    
    // Add pagination info in the response
    const totalPages = Math.ceil(total / take);
    const currentPage = Math.floor(skip / take) + 1;
    
    return NextResponse.json({
      projects,
      pagination: {
        total,
        page: currentPage,
        limit: take,
        totalPages
      }
    } as ProjectListResponse);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

// POST /api/projects
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const userEmail = await getCurrentUserEmail();

    // Validate required fields
    if (!data.name || !data.baseURL) {
      return NextResponse.json(
        { error: 'Name and Base URL are required' },
        { status: 400 }
      );
    }

    const projectRepository = new ProjectRepository();

    // Check for existing project with same name
    console.log('Checking for duplicate project name:', data.name);
    const existingProject = await projectRepository.findByName(data.name);
    
    if (existingProject) {
      console.log('Found existing project:', existingProject);
      return NextResponse.json(
        { error: 'A project with this name already exists' },
        { status: 409 }
      );
    }

    console.log('No duplicate found, proceeding with creation');
    const testManager = new TestManagerService(process.cwd());

    // Create project with transaction to include default settings
    const project = await prisma.$transaction(async (tx) => {
      // Create the project
      const newProject = await tx.project.create({
        data: {
          name: data.name,
          description: data.description,
          environment: data.environment || 'development',
          playwrightProjectPath: null,
          createdBy: userEmail,
          updatedBy: userEmail,
        },
      });

      // Create default configuration settings
      const defaultSettings = [
        // Playwright settings
        { category: 'playwright', key: 'timeout', value: '3000' },
        { category: 'playwright', key: 'expectTimeout', value: '5000' },
        { category: 'playwright', key: 'retries', value: '1' },
        { category: 'playwright', key: 'workers', value: '1' },
        { category: 'playwright', key: 'fullyParallel', value: 'false' },
        
        // Browser settings
        { category: 'browser', key: 'baseURL', value: data.baseURL },
        { category: 'browser', key: 'headless', value: 'true' },
        { category: 'browser', key: 'viewport.width', value: '1920' },
        { category: 'browser', key: 'viewport.height', value: '1080' },
        { category: 'browser', key: 'locale', value: 'en-US' },
        { category: 'browser', key: 'timezoneId', value: 'UTC' },
        { category: 'browser', key: 'video', value: 'retain-on-failure' },
        { category: 'browser', key: 'screenshot', value: 'only-on-failure' },
        { category: 'browser', key: 'trace', value: 'retain-on-failure' },
      ];

      // Create all settings
      await tx.projectSetting.createMany({
        data: defaultSettings.map(setting => ({
          projectId: newProject.id,
          category: setting.category,
          key: setting.key,
          value: setting.value,
          createdBy: userEmail,
          updatedBy: userEmail,
        })),
      });

      return newProject;
    });

    try {
      // Initialize Playwright project
      await testManager.initializePlaywrightProject(project.id);
      console.log('Playwright project initialized');

      // Get the updated project with Playwright path
      const updatedProject = await projectRepository.findById(project.id);
      return NextResponse.json(updatedProject, { status: 201 });

    } catch (error) {
      // If Playwright initialization fails, delete the project and its settings
      console.error('Error initializing Playwright project:', error);
      try {
        await projectRepository.delete(project.id);
        console.log('Cleaned up project after Playwright init failure');
      } catch (deleteError) {
        console.error('Error cleaning up project:', deleteError);
      }
      return NextResponse.json(
        { error: 'Failed to initialize Playwright project' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
} 