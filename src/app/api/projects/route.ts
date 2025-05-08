import { NextRequest, NextResponse } from 'next/server';
import { ProjectRepository } from '@/lib/db/repositories/project-repository';
import { getCurrentUserEmail } from '@/lib/auth/session';
import { TestManagerService } from '@/lib/test-manager.service';
import { CreateProjectRequest, ProjectListResponse } from '@/types';

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
    const userEmail = await getCurrentUserEmail();
    const data = await request.json() as CreateProjectRequest;
    
    // Validate required fields
    if (!data.name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    if (!data.url) {
      return NextResponse.json(
        { error: 'Project URL is required' },
        { status: 400 }
      );
    }

    const projectRepository = new ProjectRepository();

    try {
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

      // First create the project in database without Playwright path
      const project = await projectRepository.create({
        name: data.name,
        url: data.url,
        description: data.description || '',
        environment: data.environment || 'development',
        playwrightProjectPath: null, // Initially null
        createdBy: userEmail,
        updatedBy: userEmail,
      });

      console.log('Project created in database:', project);

      try {
        // Then initialize Playwright project
        await testManager.initializePlaywrightProject(project.id);
        console.log('Playwright project initialized');

        // Get the updated project with Playwright path
        const updatedProject = await projectRepository.findById(project.id);
        return NextResponse.json(updatedProject, { status: 201 });

      } catch (error) {
        // If Playwright initialization fails, delete the project from database
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
      console.error('Error in project creation process:', error);
      return NextResponse.json(
        { error: 'Failed to create project' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error parsing request:', error);
    return NextResponse.json(
      { error: 'Invalid request data' },
      { status: 400 }
    );
  }
} 