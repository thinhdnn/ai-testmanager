import { NextRequest, NextResponse } from 'next/server';
import { checkResourcePermission } from '@/lib/rbac/check-permission';
import { getCurrentUserEmail } from '@/lib/auth/session';
import { Release, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

// GET /api/projects/[id]/releases
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    
    // Check permission
    const hasPermission = await checkResourcePermission('project', 'view', projectId);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query parameters
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const skip = (page - 1) * pageSize;
    
    // Sorting
    const sortField = searchParams.get('sortField') || 'updatedAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const orderBy: Prisma.ReleaseOrderByWithRelationInput = {
      [sortField]: sortOrder.toLowerCase(),
    };

    // Filtering
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.toLowerCase();
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build filter
    let where: Prisma.ReleaseWhereInput = { projectId };
    
    if (status) {
      where.status = status;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { version: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (startDate) {
      where.startDate = {
        gte: new Date(startDate),
      };
    }

    if (endDate) {
      where.endDate = {
        lte: new Date(endDate),
      };
    }

    // Get releases with test case count
    const releases = await prisma.release.findMany({
      where,
      skip,
      take: pageSize,
      orderBy,
      include: {
        _count: {
          select: {
            testCases: true,
          },
        },
      },
    });

    // Get total count for pagination
    const total = await prisma.release.count({ where });

    // Format response
    const formattedReleases = releases.map(release => ({
      ...release,
      testCaseCount: release._count.testCases,
      _count: undefined,
    }));

    return NextResponse.json({
      releases: formattedReleases,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Error fetching releases:', error);
    return NextResponse.json(
      { error: 'Failed to fetch releases' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/releases
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const userEmail = await getCurrentUserEmail();
    
    // Check permission
    const hasPermission = await checkResourcePermission('project', 'update', projectId);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, version, description, startDate, endDate, status } = body;

    // Validate required fields
    if (!name || !version || !startDate) {
      return NextResponse.json(
        { error: 'Name, version and start date are required' },
        { status: 400 }
      );
    }

    const release = await prisma.release.create({
      data: {
        project: {
          connect: { id: projectId }
        },
        name,
        version,
        description,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        status: status || 'planning',
        createdBy: userEmail,
        updatedBy: userEmail,
      }
    });

    return NextResponse.json(release);
  } catch (error) {
    console.error('Error creating release:', error);
    return NextResponse.json(
      { error: 'Failed to create release' },
      { status: 500 }
    );
  }
} 