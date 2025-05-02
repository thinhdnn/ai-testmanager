import { prisma } from "../db/prisma";

export interface TestResultTrend {
  date: string;
  passed: number;
  failed: number;
  skipped: number;
}

export interface TagStats {
  name: string;
  count: number;
  passRate: number;
}

export interface DashboardStats {
  totalProjects: number;
  totalTestCases: number;
  totalExecutions: number;
  passRate: number;
  trends: TestResultTrend[];
  tagStats: TagStats[];
}

export interface ProjectStats {
  totalTestCases: number;
  totalExecutions: number;
  passRate: number;
  trends: TestResultTrend[];
  tagStats: TagStats[];
}

/**
 * Service to fetch and prepare dashboard visualization data
 */
export class DashboardService {
  /**
   * Get overall dashboard statistics
   */
  static async getDashboardStats(userId?: string): Promise<DashboardStats> {
    // Get basic counts
    const [totalProjects, totalTestCases, totalExecutions] = await Promise.all([
      prisma.project.count(),
      prisma.testCase.count(),
      prisma.testResultHistory.count(),
    ]);

    // Calculate overall pass rate
    const passCount = await prisma.testResultHistory.count({
      where: {
        success: true,
      },
    });
    
    const passRate = totalExecutions > 0 ? passCount / totalExecutions : 0;

    // Get trends (last 30 days)
    const trends = await this.getTestResultTrends(30);
    
    // Get tag statistics
    const tagStats = await this.getTagStats();

    return {
      totalProjects,
      totalTestCases,
      totalExecutions,
      passRate,
      trends,
      tagStats,
    };
  }

  /**
   * Get statistics for a specific project
   */
  static async getProjectStats(projectId: string): Promise<ProjectStats> {
    // Get basic counts for this project
    const [totalTestCases, totalExecutions] = await Promise.all([
      prisma.testCase.count({ 
        where: { projectId }
      }),
      prisma.testResultHistory.count({
        where: { projectId }
      }),
    ]);

    // Calculate project pass rate
    const passCount = await prisma.testResultHistory.count({
      where: {
        projectId,
        success: true,
      },
    });
    
    const passRate = totalExecutions > 0 ? passCount / totalExecutions : 0;

    // Get trends for this project (last 30 days)
    const trends = await this.getTestResultTrends(30, projectId);
    
    // Get tag statistics for this project
    const tagStats = await this.getTagStats(projectId);

    return {
      totalTestCases,
      totalExecutions,
      passRate,
      trends,
      tagStats,
    };
  }

  /**
   * Get test result trends for a specific period
   */
  static async getTestResultTrends(days: number = 30, projectId?: string): Promise<TestResultTrend[]> {
    // Calculate the start date
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Build where clause
    const whereClause: any = {
      createdAt: {
        gte: startDate,
      },
    };
    
    // Add project filter if specified
    if (projectId) {
      whereClause.projectId = projectId;
    }
    
    // Get all test results within the period
    const results = await prisma.testResultHistory.findMany({
      where: whereClause,
      select: {
        createdAt: true,
        success: true,
        status: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group results by date
    const resultsByDate = new Map<string, {passed: number; failed: number; skipped: number}>();
    
    // Fill in all dates in the range even if no data
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      resultsByDate.set(dateStr, { passed: 0, failed: 0, skipped: 0 });
    }
    
    // Populate with actual data
    results.forEach(result => {
      const dateStr = result.createdAt.toISOString().split('T')[0];
      const current = resultsByDate.get(dateStr) || { passed: 0, failed: 0, skipped: 0 };
      
      if (result.status === 'skipped') {
        current.skipped++;
      } else if (result.success) {
        current.passed++;
      } else {
        current.failed++;
      }
      
      resultsByDate.set(dateStr, current);
    });
    
    // Convert to array format
    return Array.from(resultsByDate).map(([date, counts]) => ({
      date,
      ...counts
    }));
  }

  /**
   * Get tag statistics with pass rate
   */
  static async getTagStats(projectId?: string): Promise<TagStats[]> {
    // Build where clause for test cases
    const whereClause: any = {};
    if (projectId) {
      whereClause.projectId = projectId;
    }
    
    // Get all test cases matching the filter
    const testCases = await prisma.testCase.findMany({
      where: whereClause,
      select: {
        tags: true,
        id: true,
      },
    });
    
    const tagMap = new Map<string, {count: number; testCaseIds: string[]}>();
    
    // Collect all tags and the test cases they appear in
    testCases.forEach(testCase => {
      if (!testCase.tags) return;
      
      // Parse tags (assuming they're stored as a comma-separated string)
      const tags = testCase.tags.split(',').map(tag => tag.trim());
      
      tags.forEach(tag => {
        if (!tag) return;
        
        const current = tagMap.get(tag) || { count: 0, testCaseIds: [] };
        current.count++;
        current.testCaseIds.push(testCase.id);
        tagMap.set(tag, current);
      });
    });
    
    // Now get test results for each tag's test cases
    const tagStats: TagStats[] = [];
    
    for (const [tagName, { count, testCaseIds }] of tagMap.entries()) {
      // Build where clause for test results
      const resultsWhereClause: any = {
        testCaseId: {
          in: testCaseIds,
        },
      };
      
      // Add project filter if specified
      if (projectId) {
        resultsWhereClause.projectId = projectId;
      }
      
      // Get the most recent result for each test case with this tag
      const results = await prisma.testResultHistory.findMany({
        where: resultsWhereClause,
        orderBy: {
          createdAt: 'desc',
        },
        distinct: ['testCaseId'],
      });
      
      // Calculate pass rate for this tag
      const passCount = results.filter(r => r.success).length;
      const passRate = results.length > 0 ? passCount / results.length : 0;
      
      tagStats.push({
        name: tagName,
        count,
        passRate,
      });
    }
    
    return tagStats;
  }
} 