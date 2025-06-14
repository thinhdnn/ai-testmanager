import { NextRequest, NextResponse } from 'next/server';
import { FixtureRepository } from '@/lib/db/repositories/fixture-repository';
import { FixtureVersionRepository } from '@/lib/db/repositories/fixture-version-repository';
import { checkResourcePermission } from '@/lib/rbac/check-permission';
import { getCurrentUserEmail } from '@/lib/auth/session';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/options';
import { PrismaClient } from '@prisma/client';
import { TestManagerService } from '@/lib/playwright/test-manager.service';
import path from 'path';

const fixtureRepository = new FixtureRepository();
const fixtureVersionRepository = new FixtureVersionRepository();
const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // In Next.js 15, params is a Promise that must be awaited
    const params_data = await params;
    const projectId = params_data.id;
    
    const hasPermission = await checkResourcePermission('project', 'view', projectId);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query parameters
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const skip = searchParams.get('skip') ? parseInt(searchParams.get('skip')!) : undefined;
    const take = searchParams.get('take') ? parseInt(searchParams.get('take')!) : undefined;
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    // Build filter
    let where: any = { projectId };
    if (type) {
      where.type = type;
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    // Get fixtures
    const fixtures = await fixtureRepository.findByProjectId(projectId, {
      skip,
      take,
      where,
      orderBy: { updatedAt: 'desc' },
    });

    const count = await fixtureRepository.count(where);

    return NextResponse.json({ fixtures, count }, { status: 200 });
  } catch (error) {
    console.error('Error fetching fixtures:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fixtures' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // In Next.js 15, params is a Promise that must be awaited
    const params_data = await params;
    const projectId = params_data.id;
    
    const userEmail = await getCurrentUserEmail();

    // Log params for debugging
    console.log('Creating fixture - params:', { projectId, userEmail });

    const hasPermission = await checkResourcePermission('project', 'update', projectId);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden - You do not have permission to create fixtures in this project' }, { status: 403 });
    }

    // Get project to get playwright project path
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project || !project.playwrightProjectPath) {
      return NextResponse.json(
        { error: 'Project or Playwright project path not found' },
        { status: 400 }
      );
    }

    // Convert relative project path to absolute path
    const appRoot = process.cwd();
    const absoluteProjectPath = path.join(appRoot, project.playwrightProjectPath);
    const testManagerService = new TestManagerService(absoluteProjectPath);

    const body = await request.json();
    let { name, type, exportName } = body;
    
    // Generate filename automatically from name
    const filename = `${name.toLowerCase().replace(/\s+/g, '-')}.fixture.ts`;
    
    // Log request body for debugging
    console.log('Creating fixture - request body:', { name, type, exportName, filename });

    if (!name) {
      return NextResponse.json(
        { error: 'Fixture name is required' },
        { status: 400 }
      );
    }

    if (!type) {
      return NextResponse.json(
        { error: 'Fixture type is required' },
        { status: 400 }
      );
    }

    if (!exportName) {
      return NextResponse.json(
        { error: 'Export name is required' },
        { status: 400 }
      );
    }

    // Enhanced error handling for creating fixture
    try {
      const fixture = await fixtureRepository.create({
        name,
        playwrightScript: '',
        type,
        filename,
        exportName,
        fixtureFilePath: undefined, // Will be set by TestManagerService.createFixtureFile()
        projectId,
        createdBy: userEmail,
        updatedBy: userEmail,
      });
      
      // Log created fixture for debugging
      console.log('Fixture created successfully:', fixture);
      
      // Create initial version for the fixture
      await fixtureVersionRepository.create({
        fixtureId: fixture.id,
        version: '1.0.0',
        name: fixture.name,
        playwrightScript: fixture.playwrightScript || undefined,
        createdBy: userEmail
      });

      // Create the fixture TypeScript file
      try {
        await testManagerService.createFixtureFile(fixture.id);
        console.log('Fixture TypeScript file created successfully');
      } catch (fileError) {
        console.error('Error creating fixture TypeScript file:', fileError);
        // Continue anyway, as the fixture is already created in the database
      }
      
      // Attempt to ensure the current user has view permission on this project
      try {
        const session = await getServerSession(authOptions);
        if (session && session.user && session.user.name) {
          console.log('Ensuring user has view permission on project');
          
          // Find the user
          const user = await prisma.user.findUnique({
            where: { username: session.user.name },
            include: {
              roles: {
                include: {
                  role: {
                    include: {
                      permissions: {
                        include: {
                          permission: true
                        }
                      }
                    }
                  }
                }
              }
            }
          });
          
          if (user) {
            // Find the view permission ID
            const viewPermission = await prisma.permission.findFirst({
              where: { name: 'project.view' }
            });
            
            if (viewPermission) {
              // Check if user already has this permission through their role
              const hasPermissionThroughRole = user.roles.some(userRole => 
                userRole.role.permissions.some(rolePerm => 
                  rolePerm.permission.name === 'project.view'
                )
              );

              if (!hasPermissionThroughRole) {
                // Check if permission assignment already exists
                const existingPermission = await prisma.permissionAssignment.findFirst({
                  where: {
                    userId: user.id,
                    permissionId: viewPermission.id,
                    resourceType: 'project',
                    resourceId: projectId
                  }
                });
                
                // If no permission exists, create it
                if (!existingPermission) {
                  await prisma.permissionAssignment.create({
                    data: {
                      userId: user.id,
                      permissionId: viewPermission.id,
                      resourceType: 'project',
                      resourceId: projectId
                    }
                  });
                  console.log('Added view permission for user on project');
                } else {
                  console.log('User already has view permission on project');
                }
              } else {
                console.log('User already has view permission through their role');
              }
            } else {
              console.log('View permission not found in database');
            }
          } else {
            console.log('User not found in database');
          }
        }
      } catch (permError) {
        console.error('Error ensuring user permissions:', permError);
        // Continue anyway, this is just an enhancement
      }
      
      return NextResponse.json(fixture, { status: 201 });
    } catch (createError: any) {
      console.error('Error in fixture repository create:', createError);
      return NextResponse.json(
        { error: `Failed to create fixture in database: ${createError.message}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error creating fixture:', error);
    return NextResponse.json(
      { error: `Failed to create fixture: ${error.message}` },
      { status: 500 }
    );
  }
} 