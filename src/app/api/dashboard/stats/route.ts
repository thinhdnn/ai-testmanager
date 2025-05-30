import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';

interface ExecutionStats {
  passed: number;
  failed: number;
  skipped: number;
}

type TestCaseExecution = {
  id: string;
  testResultId: string;
  testCaseId: string;
  status: string;
  duration: number | null;
  errorMessage: string | null;
  output: string | null;
  startTime: Date | null;
  endTime: Date | null;
  retries: number;
  createdAt: Date;
};

type TestResultWithExecutions = {
  id: string;
  projectId: string;
  success: boolean;
  status: string;
  executionTime: number | null;
  output: string | null;
  errorMessage: string | null;
  resultData: string | null;
  createdAt: Date;
  createdBy: string | null;
  lastRunBy: string | null;
  browser: string | null;
  videoUrl: string | null;
  testCaseExecutions: TestCaseExecution[];
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Get total test cases
    const totalTestCases = await prisma.testCase.count({
      where: projectId ? { projectId } : undefined
    });

    // Get test cases by status
    const testCasesByStatus = await prisma.testCase.groupBy({
      by: ['status'],
      where: projectId ? { projectId } : undefined,
      _count: true
    });

    // Get test cases by tag
    const testCasesWithTags = await prisma.testCase.findMany({
      where: projectId ? { projectId } : undefined,
      select: {
        id: true,
        tags: true
      }
    });

    const tagStats = testCasesWithTags.reduce((acc: { [key: string]: number }, testCase) => {
      if (testCase.tags) {
        const tags = testCase.tags.split(',');
        tags.forEach(tag => {
          const trimmedTag = tag.trim();
          acc[trimmedTag] = (acc[trimmedTag] || 0) + 1;
        });
      }
      return acc;
    }, {});

    // Get test execution trends
    const testResults = await prisma.testResultHistory.findMany({
      where: {
        projectId: projectId || undefined,
        createdAt: {
          gte: dateFrom ? new Date(dateFrom) : undefined,
          lte: dateTo ? new Date(dateTo) : undefined
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    const executionTrends = testResults.reduce((acc: { [key: string]: ExecutionStats }, result) => {
      const date = result.createdAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = {
          passed: 0,
          failed: 0,
          skipped: 0
        };
      }

      return acc;
    }, {});

    // Get test case executions for each result
    const testCaseExecutions = await prisma.$queryRawUnsafe<TestCaseExecution[]>(
      `SELECT id, "testResultId", "testCaseId", status, duration, "errorMessage", output, "startTime", "endTime", retries, "createdAt" FROM "TestCaseExecution" WHERE "testResultId" IN (${testResults.map(result => `'${result.id}'`).join(',')})`
    );

    // Group executions by test result date
    testCaseExecutions.forEach((execution: TestCaseExecution) => {
      const result = testResults.find(r => r.id === execution.testResultId);
      if (result) {
        const date = result.createdAt.toISOString().split('T')[0];
        if (execution.status === 'passed') executionTrends[date].passed++;
        else if (execution.status === 'failed') executionTrends[date].failed++;
        else executionTrends[date].skipped++;
      }
    });

    // Format trends for response
    const trends = Object.entries(executionTrends).map(([date, stats]) => ({
      date,
      passed: stats.passed,
      failed: stats.failed,
      skipped: stats.skipped
    }));

    return NextResponse.json({
      totalTestCases,
      testCasesByStatus,
      tagStats,
      trends
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
} 