import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUserEmail } from '@/lib/auth/session';

// GET /api/test-results/recent
export async function GET(request: NextRequest) {
  try {
    const userEmail = await getCurrentUserEmail();
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    
    // Get recent test results with related test case and project
    const recentResults = await prisma.testResultHistory.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        testCase: {
          include: {
            project: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      take: limit
    });
    
    return NextResponse.json(recentResults);
  } catch (error) {
    console.error('Error fetching recent test results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent test results' },
      { status: 500 }
    );
  }
} 