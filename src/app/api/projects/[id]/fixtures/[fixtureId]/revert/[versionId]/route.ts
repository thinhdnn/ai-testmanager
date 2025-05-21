import { NextRequest, NextResponse } from 'next/server';
import { FixtureRepository } from '@/lib/db/repositories/fixture-repository';
import { FixtureVersionRepository } from '@/lib/db/repositories/fixture-version-repository';
import { checkResourcePermission } from '@/lib/rbac/check-permission';
import { getCurrentUserEmail } from '@/lib/auth/session';
import { incrementVersion } from '@/lib/utils/version';

// POST /api/projects/[id]/fixtures/[fixtureId]/revert/[versionId]
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; fixtureId: string; versionId: string } }
) {
  try {
    const { id: projectId, fixtureId, versionId } = await params;
    const userEmail = await getCurrentUserEmail();
    
    // Check permission
    const hasPermission = await checkResourcePermission('project', 'update', projectId);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const fixtureRepository = new FixtureRepository();
    const fixtureVersionRepository = new FixtureVersionRepository();
    
    // Check if fixture exists
    const fixture = await fixtureRepository.findById(fixtureId);
    if (!fixture) {
      return NextResponse.json({ error: 'Fixture not found' }, { status: 404 });
    }
    
    // Check if fixture belongs to the project
    if (fixture.projectId !== projectId) {
      return NextResponse.json({ error: 'Fixture not found in this project' }, { status: 404 });
    }
    
    // Get the version to revert to
    const versionToRevert = await fixtureVersionRepository.findById(versionId);
    if (!versionToRevert) {
      return NextResponse.json({ error: 'Fixture version not found' }, { status: 404 });
    }
    
    // Verify the version belongs to the specified fixture
    if (versionToRevert.fixtureId !== fixtureId) {
      return NextResponse.json({ error: 'Fixture version not found for this fixture' }, { status: 404 });
    }
    
    // Get the latest version to determine next version number
    const latestVersion = await fixtureVersionRepository.findLatestByFixtureId(fixtureId);
    let newVersionNumber = '1.0.1';
    
    if (latestVersion) {
      newVersionNumber = incrementVersion(latestVersion.version);
    }
    
    // Create a new version with the current state before reverting
    await fixtureVersionRepository.create({
      fixtureId,
      version: newVersionNumber,
      name: fixture.name,
      playwrightScript: fixture.playwrightScript || undefined,
      createdBy: userEmail
    });
    
    // Revert the fixture to the selected version
    const updatedFixture = await fixtureRepository.update(fixtureId, {
      name: versionToRevert.name,
      playwrightScript: versionToRevert.playwrightScript || undefined,
      type: fixture.type,
      filename: fixture.filename || undefined,
      exportName: fixture.exportName || undefined,
      fixtureFilePath: fixture.fixtureFilePath || undefined,
      updatedBy: userEmail,
    });
    
    return NextResponse.json({
      success: true,
      message: 'Fixture reverted successfully',
      fixture: updatedFixture
    });
  } catch (error) {
    console.error('Error reverting fixture:', error);
    return NextResponse.json(
      { error: 'Failed to revert fixture' },
      { status: 500 }
    );
  }
} 