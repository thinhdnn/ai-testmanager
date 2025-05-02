import { prisma } from '@/lib/db/prisma';

type StepVersionCreateInput = {
  testCaseVersionId?: string;
  fixtureVersionId?: string;
  action: string;
  data?: string;
  expected?: string;
  playwrightCode?: string;
  selector?: string;
  order: number;
  disabled?: boolean;
  createdBy?: string | null | undefined;
};

type StepVersionUpdateInput = {
  fixtureVersionId?: string;
  action?: string;
  data?: string;
  expected?: string;
  playwrightCode?: string;
  selector?: string;
  order?: number;
  disabled?: boolean;
};

export class StepVersionRepository {
  /**
   * Create a new step version
   */
  async create(data: StepVersionCreateInput) {
    // Only include testCaseVersionId or fixtureVersionId if defined
    const createData: any = {
      action: data.action,
      data: data.data,
      expected: data.expected,
      playwrightCode: data.playwrightCode,
      selector: data.selector,
      order: data.order,
      disabled: data.disabled,
      createdBy: data.createdBy,
      ...(data.testCaseVersionId ? { testCaseVersionId: data.testCaseVersionId } : {}),
      ...(data.fixtureVersionId ? { fixtureVersionId: data.fixtureVersionId } : {}),
    };
    return prisma.stepVersion.create({
      data: createData,
    });
  }

  /**
   * Find a step version by ID
   */
  async findById(id: string) {
    return prisma.stepVersion.findUnique({
      where: { id },
    });
  }

  /**
   * Find step versions by test case version ID
   */
  async findByTestCaseVersionId(testCaseVersionId: string) {
    return prisma.stepVersion.findMany({
      where: { testCaseVersionId },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Find step versions by fixture version ID
   */
  async findByFixtureVersionId(fixtureVersionId: string) {
    return prisma.stepVersion.findMany({
      where: { fixtureVersionId },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Update a step version
   */
  async update(id: string, data: StepVersionUpdateInput) {
    return prisma.stepVersion.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a step version
   */
  async delete(id: string) {
    return prisma.stepVersion.delete({
      where: { id },
    });
  }

  /**
   * Find step versions with fixture version
   */
  async findWithFixtureVersion(id: string) {
    return prisma.stepVersion.findUnique({
      where: { id },
      include: {
        fixtureVersion: true,
      },
    });
  }
} 