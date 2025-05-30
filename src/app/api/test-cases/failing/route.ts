import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUserEmail } from '@/lib/auth/session';

// GET /api/test-cases/failing
export async function GET(request: NextRequest) {
  try {
    const userEmail = await getCurrentUserEmail();
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '5', 10);
    
    // Get test cases with their executions that have failures
    const testCases = await prisma.testCase.findMany({
      where: {
        executions: {
          some: {
            status: {
              not: "passed"
            }
          }
        }
      },
      include: {
        project: {
          select: {
            name: true
          }
        },
        executions: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 10 // Get last 10 executions to calculate failure rate
        }
      },
      take: limit
    });

    // Calculate failure rate for each test case
    const failingTests = testCases.map(testCase => {
      const totalRuns = testCase.executions.length;
      const failures = testCase.executions.filter(execution => execution.status !== "passed").length;
      const failureRate = totalRuns > 0 ? failures / totalRuns : 0;
      
      return {
        id: testCase.id,
        name: testCase.name,
        projectId: testCase.projectId,
        project: testCase.project,
        lastRun: testCase.lastRun,
        failureRate
      };
    });

    // Sort by failure rate, highest first
    failingTests.sort((a, b) => b.failureRate - a.failureRate);
    
    return NextResponse.json(failingTests);
  } catch (error) {
    console.error('Error fetching failing tests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch failing tests' },
      { status: 500 }
    );
  }
} 