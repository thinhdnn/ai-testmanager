import { prisma } from '../prisma';
import { TestStep, Prisma, PrismaClient } from '@prisma/client';

/**
 * Repository for TestStep entity CRUD operations
 */
export class TestStepRepository {
  /**
   * Create a new test step
   */
  async create(data: Prisma.TestStepCreateInput): Promise<TestStep> {
    return prisma.testStep.create({
      data,
    });
  }

  /**
   * Create multiple test steps
   */
  async createMany(data: Prisma.TestStepCreateManyInput[]): Promise<Prisma.BatchPayload> {
    return prisma.testStep.createMany({
      data,
    });
  }

  /**
   * Get a test step by ID
   */
  async findById(id: string): Promise<TestStep | null> {
    return prisma.testStep.findUnique({
      where: { id },
    });
  }

  /**
   * Get a test step by ID with relations
   */
  async findByIdWithRelations(
    id: string, 
    relations: { testCase?: boolean; stepResults?: boolean } = {}
  ): Promise<TestStep | null> {
    return prisma.testStep.findUnique({
      where: { id },
      include: {
        testCase: relations.testCase || false,
        stepResults: relations.stepResults || false,
      },
    });
  }

  /**
   * Get all test steps with pagination and filtering
   */
  async findAll(options?: {
    skip?: number;
    take?: number;
    orderBy?: Prisma.TestStepOrderByWithRelationInput;
    where?: Prisma.TestStepWhereInput;
  }): Promise<TestStep[]> {
    return prisma.testStep.findMany({
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy,
      where: options?.where,
    });
  }

  /**
   * Update a test step
   */
  async update(id: string, data: Prisma.TestStepUpdateInput): Promise<TestStep> {
    return prisma.testStep.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a test step
   */
  async delete(id: string): Promise<TestStep> {
    return prisma.testStep.delete({
      where: { id },
    });
  }

  /**
   * Count test steps based on criteria
   */
  async count(where?: Prisma.TestStepWhereInput): Promise<number> {
    return prisma.testStep.count({
      where,
    });
  }

  /**
   * Find test steps by test case ID
   */
  async findByTestCaseId(testCaseId: string): Promise<TestStep[]> {
    return prisma.testStep.findMany({
      where: { testCaseId },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Delete all test steps for a test case
   */
  async deleteAllForTestCase(testCaseId: string): Promise<Prisma.BatchPayload> {
    return prisma.testStep.deleteMany({
      where: { testCaseId },
    });
  }

  /**
   * Reorder test steps after a step is moved
   */
  async reorderSteps(testCaseId: string, fromOrder: number, toOrder: number): Promise<void> {
    // Start a transaction to ensure all updates happen atomically
    await prisma.$transaction(async (tx: PrismaClient) => {
      // Get all steps for the test case, sorted by order
      const steps = await tx.testStep.findMany({
        where: { testCaseId },
        orderBy: { order: 'asc' },
      });

      if (fromOrder < toOrder) {
        // Moving a step down in order
        await tx.testStep.updateMany({
          where: {
            testCaseId,
            order: {
              gt: fromOrder,
              lte: toOrder,
            },
          },
          data: {
            order: { decrement: 1 },
          },
        });
      } else {
        // Moving a step up in order
        await tx.testStep.updateMany({
          where: {
            testCaseId,
            order: {
              gte: toOrder,
              lt: fromOrder,
            },
          },
          data: {
            order: { increment: 1 },
          },
        });
      }

      // Update the moved step to its new position
      await tx.testStep.updateMany({
        where: {
          testCaseId,
          order: fromOrder,
        },
        data: {
          order: toOrder,
        },
      });
    });
  }

  /**
   * Update the order of the test steps when a step is deleted
   */
  async updateOrderAfterDelete(testCaseId: string, deletedOrder: number): Promise<void> {
    await prisma.testStep.updateMany({
      where: {
        testCaseId,
        order: {
          gt: deletedOrder,
        },
      },
      data: {
        order: { decrement: 1 },
      },
    });
  }

  /**
   * Find steps with validation errors
   */
  async findWithValidationErrors(options?: {
    skip?: number;
    take?: number;
    projectId?: string;
  }): Promise<TestStep[]> {
    return prisma.testStep.findMany({
      where: {
        validationErrors: { not: null },
        testCase: options?.projectId ? { projectId: options.projectId } : undefined,
      },
      skip: options?.skip,
      take: options?.take,
      include: {
        testCase: true,
      },
    });
  }
} 