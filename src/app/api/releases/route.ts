import { NextRequest, NextResponse } from 'next/server';
import { checkPermission } from '@/lib/rbac/check-permission';
import { getCurrentUserEmail } from '@/lib/auth/session';
import { Release, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

// GET /api/releases
export async function GET(request: NextRequest) {
  try {
    // Check permission
    const hasPermission = await checkPermission('project', 'view');
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
    let where: Prisma.ReleaseWhereInput = {};
    
    if (status && status !== 'all') {
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

    // Get releases with project info and test case count
    const releases = await prisma.release.findMany({
      where,
      skip,
      take: pageSize,
      orderBy,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
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