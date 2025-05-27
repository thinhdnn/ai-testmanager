import { prisma } from '../prisma';
import { Step, Prisma, PrismaClient } from '@prisma/client';

/**
 * Repository for Step entity CRUD operations
 */
export class StepRepository {
  /**
   * Create a new step
   */
  async create(data: Prisma.StepCreateInput): Promise<Step> {
    return prisma.step.create({
      data,
    });
  }

  /**
   * Create multiple steps
   */
  async createMany(data: Prisma.StepCreateManyInput[]): Promise<Prisma.BatchPayload> {
    return prisma.step.createMany({
      data,
    });
  }

  /**
   * Get a step by ID
   */
  async findById(id: string): Promise<Step | null> {
    return prisma.step.findUnique({
      where: { id },
    });
  }

  /**
   * Get a step by ID with relations
   */
  async findByIdWithRelations(
    id: string, 
    relations: { testCase?: boolean; stepResults?: boolean } = {}
  ): Promise<Step | null> {
    return prisma.step.findUnique({
      where: { id },
      include: relations,
    });
  }

  /**
   * Find steps with pagination and filtering
   */
  async findMany(options?: {
    skip?: number;
    take?: number;
    orderBy?: Prisma.StepOrderByWithRelationInput;
    where?: Prisma.StepWhereInput;
  }): Promise<Step[]> {
    return prisma.step.findMany({
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy,
      where: options?.where,
    });
  }

  /**
   * Update a step
   */
  async update(id: string, data: Prisma.StepUpdateInput): Promise<Step> {
    return prisma.step.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a step
   */
  async delete(id: string): Promise<Step> {
    return prisma.step.delete({
      where: { id },
    });
  }

  /**
   * Find steps by test case ID
   */
  async findByTestCaseId(testCaseId: string): Promise<Step[]> {
    return prisma.step.findMany({
      where: { testCaseId },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Find steps by fixture ID
   */
  async findByFixtureId(fixtureId: string, options?: {
    skip?: number;
    take?: number;
    projectId?: string;
  }): Promise<Step[]> {
    return prisma.step.findMany({
      where: {
        fixtureId,
        ...(options?.projectId ? { fixture: { projectId: options.projectId } } : {}),
      },
      skip: options?.skip,
      take: options?.take,
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Count steps based on criteria
   */
  async count(where?: Prisma.StepWhereInput): Promise<number> {
    return prisma.step.count({
      where,
    });
  }

  /**
   * Delete all steps for a test case
   */
  async deleteAllForTestCase(testCaseId: string): Promise<Prisma.BatchPayload> {
    return prisma.step.deleteMany({
      where: { testCaseId },
    });
  }

  /**
   * Reorder steps after a step is moved
   */
  async reorderSteps(testCaseId: string, fromOrder: number, toOrder: number): Promise<void> {
    // Start a transaction to ensure all updates happen atomically
    await prisma.$transaction(async (tx) => {
      // Get all steps for the test case, sorted by order
      const steps = await tx.step.findMany({
        where: { testCaseId },
        orderBy: { order: 'asc' },
      });

      if (fromOrder < toOrder) {
        // Moving a step down in order
        await tx.step.updateMany({
          where: {
            testCaseId,
            order: {
              gt: fromOrder,
              lte: toOrder,
            },
          },
          data: {
            order: {
              decrement: 1,
            },
          },
        });
      } else {
        // Moving a step up in order
        await tx.step.updateMany({
          where: {
            testCaseId,
            order: {
              gte: toOrder,
              lt: fromOrder,
            },
          },
          data: {
            order: {
              increment: 1,
            },
          },
        });
      }

      // Update the moved step to its new position
      await tx.step.updateMany({
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
   * Update the order of the steps when a step is deleted
   */
  async updateOrderAfterDelete(testCaseId: string, deletedOrder: number): Promise<void> {
    await prisma.step.updateMany({
      where: {
        testCaseId,
        order: {
          gt: deletedOrder,
        },
      },
      data: {
        order: {
          decrement: 1,
        },
      },
    });
  }
} 