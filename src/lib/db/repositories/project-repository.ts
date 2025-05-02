import { prisma } from '@/lib/db/prisma';

type ProjectCreateInput = {
  name: string;
  url: string;
  description?: string;
  environment?: string;
  playwrightProjectPath?: string;
  createdBy?: string | null;
  updatedBy?: string | null;
};

type ProjectUpdateInput = {
  name?: string;
  url?: string;
  description?: string;
  environment?: string;
  playwrightProjectPath?: string;
  updatedBy?: string | null;
  lastRunBy?: string | null;
  lastRun?: Date | null;
};

/**
 * Tùy chọn cho các hàm find để quản lý dễ dàng hơn
 */
type ProjectFindOptions = {
  excludeFields?: string[];
  relations?: {
    testCases?: boolean;
    fixtures?: boolean;
    testResults?: boolean;
  };
};

/**
 * Repository for Project entity CRUD operations
 */
export class ProjectRepository {
  /**
   * Create a new project
   */
  async create(data: ProjectCreateInput) {
    return prisma.project.create({
      data,
    });
  }

  /**
   * Get a project by ID với tùy chọn loại trừ trường và lấy các relations
   */
  async findById(id: string, options: ProjectFindOptions = {}) {
    // Lấy dữ liệu với relations
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        testCases: options.relations?.testCases || false,
        fixtures: options.relations?.fixtures || false,
        testResults: options.relations?.testResults || false,
      },
    });
    
    if (!project) return null;
    
    // Nếu không cần loại trừ trường, trả về luôn
    if (!options.excludeFields || options.excludeFields.length === 0) {
      return project;
    }
    
    // Tạo bản sao để xử lý loại trừ trường
    const filteredProject = { ...project };
    
    // Loại bỏ các trường được chỉ định
    for (const field of options.excludeFields) {
      if (field in filteredProject) {
        delete (filteredProject as any)[field];
      }
    }
    
    return filteredProject;
  }

  /**
   * Get all projects with pagination và tùy chọn loại trừ trường
   */
  async findAll(options?: {
    skip?: number;
    take?: number;
    orderBy?: any;
    where?: any;
    excludeFields?: string[];
    relations?: {
      testCases?: boolean;
      fixtures?: boolean;
      testResults?: boolean;
    };
  }) {
    // Lấy dữ liệu với relations
    const projects = await prisma.project.findMany({
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy,
      where: options?.where,
      include: {
        testCases: options?.relations?.testCases || false,
        fixtures: options?.relations?.fixtures || false,
        testResults: options?.relations?.testResults || false,
      },
    });
    
    // Nếu không cần loại trừ trường, trả về luôn
    if (!options?.excludeFields || options.excludeFields.length === 0) {
      return projects;
    }
    
    // Xử lý loại trừ trường cho mỗi project
    return projects.map(project => {
      const filteredProject = { ...project };
      
      for (const field of options.excludeFields!) {
        if (field in filteredProject) {
          delete (filteredProject as any)[field];
        }
      }
      
      return filteredProject;
    });
  }

  /**
   * Update a project
   */
  async update(id: string, data: ProjectUpdateInput) {
    return prisma.project.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a project
   */
  async delete(id: string) {
    return prisma.project.delete({
      where: { id },
    });
  }

  /**
   * Count projects based on criteria
   */
  async count(where?: any) {
    return prisma.project.count({
      where,
    });
  }
} 