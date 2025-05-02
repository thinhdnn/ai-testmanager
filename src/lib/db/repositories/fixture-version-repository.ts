import { prisma } from '@/lib/db/prisma';

type FixtureVersionCreateInput = {
  fixtureId: string;
  version: string;
  name: string;
  description?: string;
  content?: string;
  playwrightScript?: string;
  createdBy?: string | null;
};

type FixtureVersionUpdateInput = {
  version?: string;
  name?: string;
  description?: string;
  content?: string;
  playwrightScript?: string;
};

export class FixtureVersionRepository {
  /**
   * Create a new fixture version
   */
  async create(data: FixtureVersionCreateInput) {
    return prisma.fixtureVersion.create({
      data,
    });
  }

  /**
   * Find a fixture version by ID
   */
  async findById(id: string) {
    return prisma.fixtureVersion.findUnique({
      where: { id },
    });
  }

  /**
   * Find versions by fixture ID
   */
  async findByFixtureId(fixtureId: string) {
    return prisma.fixtureVersion.findMany({
      where: { fixtureId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find the latest version for a fixture
   */
  async findLatestByFixtureId(fixtureId: string) {
    return prisma.fixtureVersion.findFirst({
      where: { fixtureId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update a fixture version
   */
  async update(id: string, data: FixtureVersionUpdateInput) {
    return prisma.fixtureVersion.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a fixture version
   */
  async delete(id: string) {
    return prisma.fixtureVersion.delete({
      where: { id },
    });
  }
} 