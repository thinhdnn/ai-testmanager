import { prisma } from '../prisma';
import { TestStepResult, Prisma } from '@prisma/client';

/**
 * Repository for TestStepResult entity CRUD operations
 */
export class TestStepResultRepository {
  /**
   * Create a new test step result
   */
  async create(data: Prisma.TestStepResultCreateInput): Promise<TestStepResult> {
    return prisma.testStepResult.create({
      data,
    });
  }

  /**
   * Create multiple test step results
   */
  async createMany(data: Prisma.TestStepResultCreateManyInput[]): Promise<Prisma.BatchPayload> {
    return prisma.testStepResult.createMany({
      data,
    });
  }

  /**
   * Get a test step result by ID
   */
  async findById(id: string): Promise<TestStepResult | null> {
    return prisma.testStepResult.findUnique({
      where: { id },
    });
  }

  /**
   * Get a test step result by ID with relations
   */
  async findByIdWithRelations(
    id: string, 
    relations: { testStep?: boolean; testResult?: boolean } = {}
  ): Promise<TestStepResult | null> {
    return prisma.testStepResult.findUnique({
      where: { id },
      include: {
        testStep: relations.testStep || false,
        testResult: relations.testResult || false,
      },
    });
  }

  /**
   * Get all test step results with pagination and filtering
   */
  async findAll(options?: {
    skip?: number;
    take?: number;
    orderBy?: Prisma.TestStepResultOrderByWithRelationInput;
    where?: Prisma.TestStepResultWhereInput;
  }): Promise<TestStepResult[]> {
    return prisma.testStepResult.findMany({
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy,
      where: options?.where,
    });
  }

  /**
   * Update a test step result
   */
  async update(id: string, data: Prisma.TestStepResultUpdateInput): Promise<TestStepResult> {
    return prisma.testStepResult.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a test step result
   */
  async delete(id: string): Promise<TestStepResult> {
    return prisma.testStepResult.delete({
      where: { id },
    });
  }

  /**
   * Count test step results based on criteria
   */
  async count(where?: Prisma.TestStepResultWhereInput): Promise<number> {
    return prisma.testStepResult.count({
      where,
    });
  }

  /**
   * Find test step results by test result ID
   */
  async findByTestResultId(testResultId: string): Promise<TestStepResult[]> {
    return prisma.testStepResult.findMany({
      where: { testResultId },
      orderBy: { order: 'asc' },
      include: {
        testStep: true,
      },
    });
  }

  /**
   * Delete all test step results for a test result
   */
  async deleteAllForTestResult(testResultId: string): Promise<Prisma.BatchPayload> {
    return prisma.testStepResult.deleteMany({
      where: { testResultId },
    });
  }

  /**
   * Find test step results by test step ID
   */
  async findByTestStepId(testStepId: string): Promise<TestStepResult[]> {
    return prisma.testStepResult.findMany({
      where: { testStepId },
      orderBy: { createdAt: 'desc' },
      include: {
        testResult: true,
      },
    });
  }

  /**
   * Get failure stats for a test step across multiple test runs
   */
  async getTestStepFailureStats(testStepId: string): Promise<{
    total: number;
    passed: number;
    failed: number;
    failureRate: number;
  }> {
    const results = await prisma.testStepResult.findMany({
      where: { testStepId },
      select: {
        status: true,
      },
    });

    const total = results.length;
    const passed = results.filter(r => r.status === 'PASSED').length;
    const failed = results.filter(r => r.status === 'FAILED').length;
    const failureRate = total > 0 ? (failed / total) * 100 : 0;

    return {
      total,
      passed,
      failed,
      failureRate,
    };
  }
} 