import { prisma } from '@/lib/db/prisma';

type StepCreateInput = {
  testCaseId?: string;
  fixtureId?: string;
  action: string;
  data?: string;
  expected?: string;
  playwrightScript?: string;
  order: number;
  disabled?: boolean;
  createdBy?: string | null;
  updatedBy?: string | null;
};

type StepUpdateInput = {
  testCaseId?: string;
  fixtureId?: string;
  action?: string;
  data?: string;
  expected?: string;
  playwrightScript?: string;
  order?: number;
  disabled?: boolean;
  updatedBy?: string | null;
};

export class StepRepository {
  /**
   * Create a new step
   */
  async create(data: StepCreateInput) {
    return prisma.step.create({
      data,
    });
  }

  /**
   * Find a step by ID
   */
  async findById(id: string) {
    return prisma.step.findUnique({
      where: { id },
    });
  }

  /**
   * Find steps by test case ID
   */
  async findByTestCaseId(testCaseId: string) {
    return prisma.step.findMany({
      where: { testCaseId },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Find steps by fixture ID
   */
  async findByFixtureId(fixtureId: string) {
    return prisma.step.findMany({
      where: { fixtureId },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Update a step
   */
  async update(id: string, data: StepUpdateInput) {
    return prisma.step.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a step
   */
  async delete(id: string) {
    return prisma.step.delete({
      where: { id },
    });
  }

  /**
   * Find steps with fixture
   */
  async findWithFixture(id: string) {
    return prisma.step.findUnique({
      where: { id },
      include: {
        fixture: true,
      },
    });
  }

  /**
   * Reorder steps after deleting one
   */
  async reorderAfterDelete(testCaseId: string, deletedOrder: number) {
    return prisma.step.updateMany({
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