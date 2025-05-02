import { prisma } from '@/lib/db/prisma';

type FixtureCreateInput = {
  projectId: string;
  name: string;
  playwrightScript?: string;
  type?: string;
  filename?: string;
  exportName?: string;
  fixtureFilePath?: string;
  createdBy?: string | null;
  updatedBy?: string | null;
};

type FixtureUpdateInput = {
  name?: string;
  playwrightScript?: string;
  type?: string;
  filename?: string;
  exportName?: string;
  fixtureFilePath?: string;
  updatedBy?: string | null;
};

/**
 * Repository for Fixture entity CRUD operations
 */
export class FixtureRepository {
  /**
   * Create a new fixture
   */
  async create(data: FixtureCreateInput) {
    const { projectId, ...fixtureData } = data;
    
    if (!projectId) {
      throw new Error('Project ID is required to create a fixture');
    }
    
    try {
      console.log('Creating fixture with data:', { projectId, ...fixtureData });
      
      // Đảm bảo rằng projectId là một phần của dữ liệu
      const fixture = await prisma.fixture.create({
        data: {
          ...fixtureData,
          projectId, // Thêm projectId trực tiếp vào dữ liệu
        },
      });
      
      console.log('Fixture created in database:', fixture);
      
      // Fetch lại fixture để đảm bảo dữ liệu nhất quán
      const verifiedFixture = await this.findById(fixture.id);
      console.log('Fixture verified after creation:', verifiedFixture);
      
      return fixture;
    } catch (error) {
      console.error(`Error creating fixture:`, error);
      throw error;
    }
  }

  /**
   * Get a fixture by ID
   */
  async findById(id: string) {
    if (!id) {
      console.error('findById called with invalid ID:', id);
      return null;
    }
    
    try {
      const fixture = await prisma.fixture.findUnique({
        where: { id },
      });
      
      if (!fixture) {
        console.log(`Fixture with ID ${id} not found`);
      }
      
      return fixture;
    } catch (error) {
      console.error(`Error finding fixture with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get fixtures by project ID with optional filters
   */
  async findByProjectId(
    projectId: string,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: any;
      where?: any;
    }
  ) {
    return prisma.fixture.findMany({
      where: {
        projectId,
        ...options?.where,
      },
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy,
    });
  }

  /**
   * Get all fixtures with pagination
   */
  async findAll(options?: {
    skip?: number;
    take?: number;
    orderBy?: any;
    where?: any;
  }) {
    return prisma.fixture.findMany({
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy,
      where: options?.where,
    });
  }

  /**
   * Update a fixture
   */
  async update(id: string, data: FixtureUpdateInput) {
    return prisma.fixture.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a fixture
   */
  async delete(id: string) {
    return prisma.fixture.delete({
      where: { id },
    });
  }

  /**
   * Count fixtures based on criteria
   */
  async count(where?: any) {
    return prisma.fixture.count({
      where,
    });
  }

  /**
   * Get a fixture with version history
   */
  async findByIdWithVersions(id: string) {
    if (!id) {
      console.error('findByIdWithVersions called with invalid ID:', id);
      return null;
    }
    
    try {
      const fixture = await prisma.fixture.findUnique({
        where: { id },
        include: {
          versions: {
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });
      
      if (!fixture) {
        console.log(`Fixture with ID ${id} not found (when fetching with versions)`);
      }
      
      return fixture;
    } catch (error) {
      console.error(`Error finding fixture with versions with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get fixtures with related steps
   */
  async findWithSteps(id: string) {
    return prisma.fixture.findUnique({
      where: { id },
      include: {
        steps: true,
      },
    });
  }
} 