import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';

type TestResultHistoryCreateInput = {
  projectId: string;
  success: boolean;
  status: string;
  executionTime?: number;
  output?: string;
  errorMessage?: string;
  resultData?: string;
  createdBy?: string | null;
  lastRunBy?: string | null;
  browser?: string;
  videoUrl?: string;
  fileName: string;
  testCaseExecutions?: Prisma.TestCaseExecutionCreateNestedManyWithoutTestResultInput;
};

type TestResultHistoryUpdateInput = {
  success?: boolean;
  status?: string;
  executionTime?: number;
  output?: string;
  errorMessage?: string;
  resultData?: string;
  lastRunBy?: string | null;
  browser?: string;
  videoUrl?: string;
  testCaseExecutions?: Prisma.TestCaseExecutionUpdateManyWithoutTestResultNestedInput;
};

export class TestResultHistoryRepository {
  /**
   * Create a new test result history
   */
  async create(data: TestResultHistoryCreateInput) {
    return prisma.testResultHistory.create({
      data,
    });
  }

  /**
   * Find a test result history by ID
   */
  async findById(id: string) {
    return prisma.testResultHistory.findUnique({
      where: { id },
    });
  }

  /**
   * Find test result histories by test case ID
   */
  async findByTestCaseId(testCaseId: string) {
    return prisma.testResultHistory.findMany({
      where: {
        testCaseExecutions: {
          some: {
            testCaseId
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        testCaseExecutions: true
      }
    });
  }

  /**
   * Find test result histories by project ID
   */
  async findByProjectId(projectId: string, options?: {
    skip?: number;
    take?: number;
    orderBy?: any;
  }) {
    return prisma.testResultHistory.findMany({
      where: { projectId },
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy || { createdAt: 'desc' },
    });
  }

  /**
   * Update a test result history
   */
  async update(id: string, data: TestResultHistoryUpdateInput) {
    return prisma.testResultHistory.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a test result history
   */
  async delete(id: string) {
    return prisma.testResultHistory.delete({
      where: { id },
    });
  }

  /**
   * Count test result histories based on criteria
   */
  async count(where?: any) {
    return prisma.testResultHistory.count({
      where,
    });
  }

  /**
   * Get the latest test result history for a test case
   */
  async findLatestByTestCaseId(testCaseId: string) {
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
        testCaseExecutions: true
      }
    });
  }
} 