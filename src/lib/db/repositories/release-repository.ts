import { prisma } from '@/lib/db/prisma';
import { Release, Prisma } from '@prisma/client';
import { ReleaseWithTestCases } from '@/types';

export class ReleaseRepository {
  static async findAll(): Promise<Release[]> {
    return prisma.release.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  static async findById(id: string): Promise<ReleaseWithTestCases | null> {
    const result = await prisma.release.findUnique({
      where: { id },
      include: {
        testCases: {
          include: {
            testCase: {
              include: {
                project: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!result) return null;

    return {
      id: result.id,
      projectId: result.projectId,
      name: result.name,
      version: result.version,
      description: result.description,
      startDate: result.startDate,
      endDate: result.endDate,
      status: result.status,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      createdBy: result.createdBy,
      updatedBy: result.updatedBy,
      testCases: result.testCases.map(tc => ({
        testCase: {
          id: tc.testCase.id,
          name: tc.testCase.name,
          project: tc.testCase.project
        }
      }))
    };
  }

  async create(data: Prisma.ReleaseCreateInput): Promise<Release> {
    return prisma.release.create({ data });
  }

  async update(id: string, data: Prisma.ReleaseUpdateInput): Promise<Release> {
    return prisma.release.update({
      where: { id },
      data
    });
  }

  async delete(id: string): Promise<Release> {
    return prisma.release.delete({
      where: { id }
    });
  }

  async count(where?: Prisma.ReleaseWhereInput): Promise<number> {
    return prisma.release.count({ where });
  }
} 