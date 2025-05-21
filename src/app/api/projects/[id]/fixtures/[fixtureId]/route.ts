import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth/options';
import { FixtureRepository } from '@/lib/db/repositories/fixture-repository';
import { FixtureVersionRepository } from '@/lib/db/repositories/fixture-version-repository';
import { checkResourcePermission } from '@/lib/rbac/check-permission';
import { getCurrentUserEmail } from '@/lib/auth/session';
import { getServerSession } from 'next-auth/next';
import { incrementVersion } from '@/lib/utils/version';
import { StepRepository } from '@/lib/db/repositories/step-repository';
import { TestManagerService } from '@/lib/playwright/test-manager.service';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { PlaywrightService } from '@/lib/playwright/playwright.service';
import * as fs from 'fs/promises';

const prisma = new PrismaClient();

// Function to convert a string to camelCase
function toCamelCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+(.)/g, (_, c) => c.toUpperCase()) // Convert to camelCase
    .replace(/\s/g, '') // Remove spaces
    .replace(/^(.)/, (_, c) => c.toLowerCase()); // Ensure first character is lowercase
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; fixtureId: string } }
) {
  try {
    const resolvedParams = await params;
    const { id: projectId, fixtureId } = resolvedParams;
    
    // Log parameters for debugging
    console.log('GET fixture - params:', { projectId, fixtureId });
    
    const session = await getServerSession(authOptions);
    console.log('Current session:', session ? { 
      user: session.user?.name,
      email: session.user?.email
    } : 'No session');
    
    const hasPermission = await checkResourcePermission('project', 'view', projectId);
    
    if (!hasPermission) {
      return NextResponse.json({ error: 'You do not have permission to view this fixture' }, { status: 403 });
    }

    const fixtureRepository = new FixtureRepository();
    const fixture = await fixtureRepository.findById(fixtureId);
    
    // Log fixture for debugging
    console.log('Fixture found:', fixture ? { id: fixture.id, name: fixture.name, projectId: fixture.projectId } : 'null');
    
    if (!fixture) {
      console.log('Fixture not found with ID:', fixtureId);
      return NextResponse.json({ error: 'Fixture not found' }, { status: 404 });
    }

    // Check if fixture belongs to the project
    if (fixture.projectId !== projectId) {
      console.log('Fixture found but belongs to a different project', {
        requestedProjectId: projectId, 
        actualProjectId: fixture.projectId
      });
      return NextResponse.json({ error: 'Fixture not found in this project' }, { status: 404 });
    }

    // Check if we should include versions
    const url = new URL(request.url);
    const includeVersions = url.searchParams.get('versions') === 'true';
    
    if (includeVersions) {
      const fixtureWithVersions = await fixtureRepository.findByIdWithVersions(fixtureId);
      return NextResponse.json(fixtureWithVersions, { status: 200 });
    }

    return NextResponse.json(fixture, { status: 200 });
  } catch (error) {
    console.error('Error fetching fixture:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fixture' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; fixtureId: string } }
) {
  try {
    const resolvedParams = await params;
    const { id: projectId, fixtureId } = resolvedParams;
    const userEmail = await getCurrentUserEmail();
    
    const hasPermission = await checkResourcePermission('project', 'update', projectId);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const fixtureRepository = new FixtureRepository();
    const fixtureVersionRepository = new FixtureVersionRepository();
    
    const fixture = await fixtureRepository.findById(fixtureId);
    if (!fixture) {
      return NextResponse.json({ error: 'Fixture not found' }, { status: 404 });
    }

    // Check if fixture belongs to the project
    if (fixture.projectId !== projectId) {
      return NextResponse.json({ error: 'Fixture not found in this project' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, type, content, exportName, tags } = body;

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
    
    // Check if name has changed - if so, we'll need to rename the fixture file
    const hasNameChanged = fixture.name !== name;
    
    // If name has changed, auto-update the exportName to camelCase of the new name
    // unless exportName was explicitly provided
    let updatedExportName = exportName;
    if (hasNameChanged && (!exportName || exportName === fixture.exportName)) {
      updatedExportName = toCamelCase(name);
      console.log(`Auto-updating exportName from ${fixture.exportName} to ${updatedExportName} based on new name`);
    }

    // Get the latest version to determine next version number
    const latestVersion = await fixtureVersionRepository.findLatestByFixtureId(fixtureId);
    let newVersionNumber = '1.0.1';
    
    if (latestVersion) {
      newVersionNumber = incrementVersion(latestVersion.version);
    }

    // Create a version before updating
    await fixtureVersionRepository.create({
      fixtureId,
      version: newVersionNumber,
      name: fixture.name,
      playwrightScript: fixture.playwrightScript || undefined,
      createdBy: userEmail
    });

    // Update the fixture in database
    const updatedFixture = await fixtureRepository.update(fixtureId, {
      name,
      type,
      exportName: updatedExportName,
      playwrightScript: '',
      // Don't update fixtureFilePath here if name has changed - we'll do it after renaming the file
      fixtureFilePath: hasNameChanged ? fixture.fixtureFilePath : body.fixtureFilePath,
      updatedBy: userEmail,
    });

    // If name has changed, rename the fixture file
    if (hasNameChanged && fixture.fixtureFilePath) {
      try {
        // Get the project's Playwright directory path
        const project = await prisma.project.findUnique({
          where: { id: projectId }
        });
        
        if (!project || !project.playwrightProjectPath) {
          throw new Error('Project or Playwright project path not found');
        }
        
        // Convert relative project path to absolute path
        const appRoot = process.cwd();
        const absoluteProjectPath = path.join(appRoot, project.playwrightProjectPath);
        
        // Initialize TestManagerService with project root path
        const testManagerService = new TestManagerService(absoluteProjectPath);
        
        // Rename the fixture file
        const newFilePath = await testManagerService.renameFixtureFile(fixtureId, fixture.name, name);
        
        if (newFilePath) {
          // Update fixtureFilePath in response object for client
          updatedFixture.fixtureFilePath = newFilePath;
        }
      } catch (error) {
        console.error('Error renaming fixture file:', error);
        // Continue anyway, as the fixture data is already updated in the database
      }
    }

    return NextResponse.json(updatedFixture, { status: 200 });
  } catch (error) {
    console.error('Error updating fixture:', error);
    return NextResponse.json(
      { error: 'Failed to update fixture' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; fixtureId: string } }
) {
  try {
    const resolvedParams = await params;
    const { id: projectId, fixtureId } = resolvedParams;
    
    // Check permission
    const hasPermission = await checkResourcePermission('project', 'update', projectId);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const fixtureRepository = new FixtureRepository();
    const stepRepository = new StepRepository();
    const fixture = await fixtureRepository.findById(fixtureId);
    
    if (!fixture) {
      return NextResponse.json({ error: 'Fixture not found' }, { status: 404 });
    }
    
    // Verify that this fixture belongs to the specified project
    if (fixture.projectId !== projectId) {
      return NextResponse.json({ error: 'Fixture not found in this project' }, { status: 404 });
    }

    // Check if any test cases are using this fixture
    const stepsInTestCases = await stepRepository.findByFixtureId(fixtureId);
    const stepsUsedInTestCases = stepsInTestCases.filter(step => step.testCaseId !== null);
    
    if (stepsUsedInTestCases.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete fixture that is in use by test cases' },
        { status: 400 }
      );
    }
    
    // Before deleting from database, get the fixture file path to remove from index.ts
    const fixtureFilePath = fixture.fixtureFilePath;
    
    // Attempt to delete - this will cascade delete fixture's own steps
    await fixtureRepository.delete(fixtureId);
    
    // If the fixture had a file, remove it from index.ts
    if (fixtureFilePath) {
      try {
        // Get the project's Playwright directory path
        const project = await prisma.project.findUnique({
          where: { id: projectId }
        });
        
        if (project && project.playwrightProjectPath) {
          // Convert relative project path to absolute path
          const appRoot = process.cwd();
          const absoluteProjectPath = path.join(appRoot, project.playwrightProjectPath);
          
          // Initialize PlaywrightService
          const playwrightService = new PlaywrightService(appRoot);
          
          // Get the fixtures directory
          const fixturesDir = path.dirname(path.join(absoluteProjectPath, fixtureFilePath));
          
          // Get the fixture filename without extension
          const fixtureFileName = path.basename(fixtureFilePath, '.ts');
          
          // Remove from index.ts
          await playwrightService.removeFixtureFromIndex(fixturesDir, fixtureFileName);
          
          // Optionally, attempt to delete the fixture file
          try {
            await fs.unlink(path.join(absoluteProjectPath, fixtureFilePath));
            console.log(`Deleted fixture file: ${fixtureFilePath}`);
          } catch (fileError: any) {
            console.warn(`Could not delete fixture file: ${fileError.message}`);
          }
        }
      } catch (indexError) {
        console.error('Error updating index.ts after deleting fixture:', indexError);
        // Continue anyway as the fixture is already deleted from the database
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting fixture:', error);
    return NextResponse.json(
      { error: 'Failed to delete fixture' },
      { status: 500 }
    );
  }
} 