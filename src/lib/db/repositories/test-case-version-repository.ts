import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { incrementVersion } from '@/lib/utils/version';

type TestCaseVersionCreateInput = {
  testCaseId: string;
  version: string;
  name: string;
  description?: string;
  playwrightScript?: string;
  createdBy?: string | null | undefined;
};

type TestCaseVersionUpdateInput = {
  version?: string;
  name?: string;
  description?: string;
  playwrightScript?: string;
};

export class TestCaseVersionRepository {
  /**
   * Create a new test case version
   */
  async create(data: TestCaseVersionCreateInput) {
    return prisma.testCaseVersion.create({
      data,
    });
  }

  /**
   * Find a test case version by ID
   */
  async findById(id: string) {
    return prisma.testCaseVersion.findUnique({
      where: { id },
    });
  }

  /**
   * Find versions by test case ID
   */
  async findByTestCaseId(testCaseId: string) {
    return prisma.testCaseVersion.findMany({
      where: { testCaseId },
      orderBy: { createdAt: 'desc' },
      include: {
        stepVersions: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  /**
   * Find the latest version for a test case
   */
  async findLatestByTestCaseId(testCaseId: string) {
    return prisma.testCaseVersion.findFirst({
      where: { testCaseId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update a test case version
   */
  async update(id: string, data: TestCaseVersionUpdateInput) {
    return prisma.testCaseVersion.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a test case version
   */
  async delete(id: string) {
    return prisma.testCaseVersion.delete({
      where: { id },
    });
  }

  /**
   * Increments a test case version and creates a new version record
   * @param testCaseId The ID of the test case
   * @param userEmail The email of the user making the change
   * @returns The newly created version
   */
  async incrementVersion(testCaseId: string, userEmail: string | null) {
    // Find the latest version for this test case
    const latestVersion = await this.findLatestByTestCaseId(testCaseId);
    
    if (!latestVersion) {
      throw new Error(`No version found for test case with ID ${testCaseId}`);
    }
    
    // Increment the version string
    const newVersionNumber = incrementVersion(latestVersion.version);
    
    // Create a new version entry
    return await prisma.testCaseVersion.create({
      data: {
        testCaseId,
        version: newVersionNumber,
        name: latestVersion.name,
        createdBy: userEmail || undefined,
      }
    });
  }
} 