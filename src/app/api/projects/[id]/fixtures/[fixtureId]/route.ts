import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth/options';
import { FixtureRepository } from '@/lib/db/repositories/fixture-repository';
import { FixtureVersionRepository } from '@/lib/db/repositories/fixture-version-repository';
import { checkResourcePermission } from '@/lib/rbac/check-permission';
import { getCurrentUserEmail } from '@/lib/auth/session';
import { getServerSession } from 'next-auth/next';
import { incrementVersion } from '@/lib/utils/version';
import { StepRepository } from '@/lib/db/repositories/step-repository';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; fixtureId: string } }
) {
  try {
    const { id: projectId, fixtureId } = params;
    
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
    const { id: projectId, fixtureId } = params;
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

    // Update the fixture
    const updatedFixture = await fixtureRepository.update(fixtureId, {
      name,
      type,
      exportName,
      playwrightScript: body.playwrightScript,
      filename: body.filename,
      fixtureFilePath: body.fixtureFilePath,
      updatedBy: userEmail,
    });

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
    const { id: projectId, fixtureId } = params;
    
    // Check permission
    const hasPermission = await checkResourcePermission('project', 'delete', projectId);
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
    
    // Attempt to delete - this will cascade delete fixture's own steps
    await fixtureRepository.delete(fixtureId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting fixture:', error);
    return NextResponse.json(
      { error: 'Failed to delete fixture' },
      { status: 500 }
    );
  }
} 