import { prisma } from '../prisma';
import { TestResultHistory as TestResult, Prisma } from '@prisma/client';

/**
 * Repository for TestResult entity CRUD operations
 */
export class TestResultRepository {
  /**
   * Create a new test result
   */
  async create(data: Prisma.TestResultHistoryCreateInput): Promise<TestResult> {
    return prisma.testResultHistory.create({
      data,
      include: {
        testCaseExecutions: {
          include: {
            testCase: true
          }
        }
      }
    });
  }

  /**
   * Get a test result by ID
   */
  async findById(id: string): Promise<TestResult | null> {
    return prisma.testResultHistory.findUnique({
      where: { id },
      include: {
        testCaseExecutions: {
          include: {
            testCase: true
          }
        }
      }
    });
  }

  /**
   * Get a test result by ID with relations
   */
  async findByIdWithRelations(
    id: string, 
    relations: { testCaseExecutions?: boolean } = {}
  ): Promise<TestResult | null> {
    return prisma.testResultHistory.findUnique({
      where: { id },
      include: {
        testCaseExecutions: relations.testCaseExecutions ? {
          include: {
            testCase: true
          }
        } : false
      }
    });
  }

  /**
   * Get all test results with pagination and filtering
   */
  async findAll(options?: {
    skip?: number;
    take?: number;
    orderBy?: Prisma.TestResultHistoryOrderByWithRelationInput;
    where?: Prisma.TestResultHistoryWhereInput;
  }): Promise<TestResult[]> {
    return prisma.testResultHistory.findMany({
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy,
      where: options?.where,
      include: {
        testCaseExecutions: {
          include: {
            testCase: true
          }
        }
      }
    });
  }

  /**
   * Update a test result
   */
  async update(id: string, data: Prisma.TestResultHistoryUpdateInput): Promise<TestResult> {
    return prisma.testResultHistory.update({
      where: { id },
      data,
      include: {
        testCaseExecutions: {
          include: {
            testCase: true
          }
        }
      }
    });
  }

  /**
   * Delete a test result
   */
  async delete(id: string): Promise<TestResult> {
    return prisma.testResultHistory.delete({
      where: { id }
    });
  }

  /**
   * Count test results based on criteria
   */
  async count(where?: Prisma.TestResultHistoryWhereInput): Promise<number> {
    return prisma.testResultHistory.count({
      where
    });
  }

  /**
   * Find test results by test case ID
   */
  async findByTestCaseId(
    testCaseId: string,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.TestResultHistoryOrderByWithRelationInput;
    }
  ): Promise<TestResult[]> {
    return prisma.testResultHistory.findMany({
      where: {
        testCaseExecutions: {
          some: {
            testCaseId
          }
        }
      },
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy || { createdAt: 'desc' },
      include: {
        testCaseExecutions: {
          include: {
            testCase: true
          }
        }
      }
    });
  }

  /**
   * Find the latest test result for a test case
   */
  async findLatestByTestCaseId(testCaseId: string): Promise<TestResult | null> {
    return prisma.testResultHistory.findFirst({
      where: {
        testCaseExecutions: {
          some: {
            testCaseId
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        testCaseExecutions: {
          include: {
            testCase: true
          }
        }
      }
    });
  }

  /**
   * Find test results by project ID
   */
  async findByProjectId(
    projectId: string,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.TestResultHistoryOrderByWithRelationInput;
      status?: string;
      dateFrom?: Date;
      dateTo?: Date;
    }
  ): Promise<TestResult[]> {
    return prisma.testResultHistory.findMany({
      where: {
        projectId,
        status: options?.status ? options.status : undefined,
        createdAt: {
          gte: options?.dateFrom,
          lte: options?.dateTo,
        },
      },
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy || { createdAt: 'desc' },
      include: {
        testCaseExecutions: {
          include: {
            testCase: true
          }
        }
      }
    });
  }

  /**
   * Get test run statistics for a project
   */
  async getProjectStats(projectId: string, dateFrom?: Date, dateTo?: Date): Promise<{
    total: number;
    passed: number;
    failed: number;
    blocked: number;
    skipped: number;
  }> {
    const results = await prisma.testResultHistory.findMany({
      where: {
        projectId,
        createdAt: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
      select: {
        status: true,
      },
    });

    const stats = {
      total: results.length,
      passed: results.filter(r => r.status === 'PASSED').length,
      failed: results.filter(r => r.status === 'FAILED').length,
      blocked: results.filter(r => r.status === 'BLOCKED').length,
      skipped: results.filter(r => r.status === 'SKIPPED').length,
    };

    return stats;
  }
} 