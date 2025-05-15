import { NextRequest, NextResponse } from 'next/server';
import { FixtureVersionRepository } from '@/lib/db/repositories/fixture-version-repository';
import { checkResourcePermission } from '@/lib/rbac/check-permission';

// GET /api/projects/[id]/fixtures/[fixtureId]/versions/[versionId]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; fixtureId: string; versionId: string } }
) {
  try {
    const { id: projectId, fixtureId, versionId } = params;
    
    // Check permission
    const hasPermission = await checkResourcePermission('project', 'view', projectId);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const fixtureVersionRepository = new FixtureVersionRepository();
    const version = await fixtureVersionRepository.findById(versionId);
    
    if (!version) {
      return NextResponse.json({ error: 'Fixture version not found' }, { status: 404 });
    }
    
    // Verify the version belongs to the specified fixture
    if (version.fixtureId !== fixtureId) {
      return NextResponse.json({ error: 'Fixture version not found for this fixture' }, { status: 404 });
    }
    
    return NextResponse.json(version);
  } catch (error) {
    console.error('Error fetching fixture version:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fixture version' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/fixtures/[fixtureId]/versions/[versionId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; fixtureId: string; versionId: string } }
) {
  try {
    const { id: projectId, fixtureId, versionId } = params;
    
    // Check permission
    const hasPermission = await checkResourcePermission('project', 'update', projectId);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const fixtureVersionRepository = new FixtureVersionRepository();
    const version = await fixtureVersionRepository.findById(versionId);
    
    if (!version) {
      return NextResponse.json({ error: 'Fixture version not found' }, { status: 404 });
    }
    
    // Verify the version belongs to the specified fixture
    if (version.fixtureId !== fixtureId) {
      return NextResponse.json({ error: 'Fixture version not found for this fixture' }, { status: 404 });
    }
    
    // Check if it's the only version - don't allow deletion of the last version
    const allVersions = await fixtureVersionRepository.findByFixtureId(fixtureId);
    if (allVersions.length <= 1) {
      return NextResponse.json(
        { error: 'Cannot delete the only version of a fixture' },
        { status: 400 }
      );
    }
    
    await fixtureVersionRepository.delete(versionId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting fixture version:', error);
    return NextResponse.json(
      { error: 'Failed to delete fixture version' },
      { status: 500 }
    );
  }
} 