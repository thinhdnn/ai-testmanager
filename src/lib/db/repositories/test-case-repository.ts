import { prisma } from '@/lib/db/prisma';

type TestCaseCreateInput = {
  projectId: string;
  name: string;
  status?: string;
  version?: string;
  isManual?: boolean;
  tags?: string;
  testFilePath?: string;
  playwrightScript?: string;
  createdBy?: string | null;
  updatedBy?: string | null;
};

type TestCaseUpdateInput = {
  name?: string;
  status?: string;
  version?: string;
  isManual?: boolean;
  tags?: string;
  testFilePath?: string;
  playwrightScript?: string;
  updatedBy?: string | null;
};

export class TestCaseRepository {
  async findById(id: string) {
    return prisma.testCase.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { order: 'asc' }
        }
      }
    });
  }

  async findByProjectId(projectId: string) {
    return prisma.testCase.findMany({
      where: { projectId },
      orderBy: { updatedAt: 'desc' }
    });
  }

  /**
   * Find all test cases with pagination and filtering options
   */
  async findAll(options?: {
    skip?: number;
    take?: number;
    orderBy?: any;
    where?: any;
    includeSteps?: boolean;
  }) {
    return prisma.testCase.findMany({
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy || { updatedAt: 'desc' },
      where: options?.where || {},
      include: {
        project: true,
        _count: {
          select: {
            steps: true
          }
        },
        ...(options?.includeSteps ? { 
          steps: {
            orderBy: { order: 'asc' }
          } 
        } : {})
      }
    });
  }

  async create(data: TestCaseCreateInput) {
    return prisma.testCase.create({
      data: {
        name: data.name,
        status: data.status || 'pending',
        version: data.version || '1.0.0',
        isManual: data.isManual !== undefined ? data.isManual : true,
        projectId: data.projectId,
        testFilePath: data.testFilePath,
        playwrightScript: data.playwrightScript,
        createdBy: data.createdBy || null,
        updatedBy: data.updatedBy || null,
        tags: data.tags || null
      }
    });
  }

  async update(id: string, data: TestCaseUpdateInput) {
    const updateData: any = {};
    
    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    
    if (data.status !== undefined) {
      updateData.status = data.status;
    }
    
    if (data.isManual !== undefined) {
      updateData.isManual = data.isManual;
    }
    
    if (data.updatedBy !== undefined) {
      updateData.updatedBy = data.updatedBy;
    }
    
    if (data.tags !== undefined) {
      updateData.tags = data.tags;
    }
    
    if (data.version !== undefined) {
      updateData.version = data.version;
    }
    
    if (data.testFilePath !== undefined) {
      updateData.testFilePath = data.testFilePath;
    }
    
    if (data.playwrightScript !== undefined) {
      updateData.playwrightScript = data.playwrightScript;
    }
    
    return prisma.testCase.update({
      where: { id },
      data: updateData
    });
  }

  async delete(id: string) {
    return prisma.testCase.delete({
      where: { id }
    });
  }
}

/**
 * Helper function to get paginated test cases with filtering
 */
export async function getTestCases(projectId: string, options: {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  tags?: string[];
}) {
  const { page, limit, search, status, tags } = options;
  const skip = (page - 1) * limit;

  // Build where condition
  const where: any = { projectId };

  // Add search filter
  if (search) {
    where.name = {
      contains: search,
      mode: 'insensitive',
    };
  }

  // Add status filter
  if (status) {
    where.status = status;
  }

  // Add tags filter
  if (tags && tags.length > 0) {
    // For each tag, we need to check if it exists in the comma-separated tags field
    where.OR = tags.map(tag => ({
      tags: {
        contains: tag,
        mode: 'insensitive',
      },
    }));
  }

  // Get test cases with count
  const [testCases, totalItems] = await Promise.all([
    prisma.testCase.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: {
            steps: true,
          },
        },
      },
    }),
    prisma.testCase.count({ where }),
  ]);

  // Calculate total pages
  const totalPages = Math.ceil(totalItems / limit);

  return { testCases, totalItems, totalPages };
} 