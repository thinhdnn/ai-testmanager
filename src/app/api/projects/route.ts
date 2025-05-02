import { NextRequest, NextResponse } from 'next/server';
import { ProjectRepository } from '@/lib/db/repositories/project-repository';
import { getCurrentUserEmail } from '@/lib/auth/session';

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
    });
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
    const data = await request.json();
    
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
    const project = await projectRepository.create({
      name: data.name,
      url: data.url,
      description: data.description || '',
      environment: data.environment || 'development',
      playwrightProjectPath: data.playwrightProjectPath || null,
      createdBy: userEmail,
      updatedBy: userEmail,
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
} 