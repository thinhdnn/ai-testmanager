import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUserEmail } from '@/lib/auth/session';

// Define types for the data structures
interface TagStat {
  count: number;
  passed: number;
  total: number;
}

interface DailyStat {
  passed: number;
  failed: number;
  total: number;
}

// GET /api/dashboard/stats
export async function GET(request: NextRequest) {
  try {
    const userEmail = await getCurrentUserEmail();
    
    // Get counts for key metrics
    const totalTestCases = await prisma.testCase.count();
    const totalProjects = await prisma.project.count();
    const totalExecutions = await prisma.testResultHistory.count();
    
    // Get successful runs count for pass rate calculation
    const successfulRuns = await prisma.testResultHistory.count({
      where: {
        success: true
      }
    });
    
    // Calculate pass rate (default to 0 if no test runs)
    const passRate = totalExecutions > 0 ? successfulRuns / totalExecutions : 0;
    
    // Get tag statistics
    const testCasesWithTags = await prisma.testCase.findMany({
      where: {
        tags: {
          not: null
        }
      },
      select: {
        id: true,
        tags: true,
        testResults: {
          select: {
            success: true
          }
        }
      }
    });
    
    // Process tags
    const tagMap = new Map<string, TagStat>();
    testCasesWithTags.forEach(testCase => {
      if (testCase.tags) {
        const tags = testCase.tags.split(',').map(tag => tag.trim());
        tags.forEach(tag => {
          if (!tagMap.has(tag)) {
            tagMap.set(tag, { count: 0, passed: 0, total: 0 });
          }
          
          const tagStat = tagMap.get(tag)!;
          tagStat.count++;
          
          // Calculate success rate for this tag
          if (testCase.testResults.length > 0) {
            const successfulRuns = testCase.testResults.filter(result => result.success).length;
            tagStat.passed += successfulRuns;
            tagStat.total += testCase.testResults.length;
          }
        });
      }
    });
    
    // Convert tag map to array for the response
    const tagStats = Array.from(tagMap.entries()).map(([tag, stats]) => ({
      tag,
      count: stats.count,
      passRate: stats.total > 0 ? stats.passed / stats.total : 0
    }));
    
    // Sort tags by count (most popular first)
    tagStats.sort((a, b) => b.count - a.count);
    
    // Get trend data for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentResults = await prisma.testResultHistory.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    // Group by day
    const resultsByDay: Record<string, DailyStat> = {};
    
    recentResults.forEach(result => {
      const date = result.createdAt.toISOString().split('T')[0];
      
      if (!resultsByDay[date]) {
        resultsByDay[date] = { passed: 0, failed: 0, total: 0 };
      }
      
      resultsByDay[date].total++;
      
      if (result.success) {
        resultsByDay[date].passed++;
      } else {
        resultsByDay[date].failed++;
      }
    });
    
    // Convert to array for the response
    const trendData = Object.entries(resultsByDay).map(([date, stats]) => ({
      date,
      passed: stats.passed,
      failed: stats.failed,
      total: stats.total,
      passRate: stats.total > 0 ? stats.passed / stats.total : 0
    }));
    
    // Return comprehensive dashboard stats
    return NextResponse.json({
      totalTestCases,
      totalProjects,
      totalExecutions,
      passRate,
      tagStats,
      trends: trendData
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
} 