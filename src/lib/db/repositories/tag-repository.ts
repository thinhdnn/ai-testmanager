import { prisma } from '@/lib/db/prisma';
import { Tag, Prisma } from '@prisma/client';

type TagCreateInput = {
  value: string;
  label?: string;
  projectId?: string | null;
};

export class TagRepository {
  /**
   * Find a tag by its value and project ID
   */
  async findByValueAndProject(value: string, projectId: string | null): Promise<Tag | null> {
    return prisma.tag.findFirst({
      where: {
        value,
        projectId: projectId as any
      }
    });
  }

  /**
   * Find all tags for a project
   */
  async findByProject(projectId: string | null): Promise<Tag[]> {
    return prisma.tag.findMany({
      where: { 
        projectId: projectId as any
      },
      orderBy: { value: 'asc' }
    });
  }

  /**
   * Find all global tags (not associated with any project)
   */
  async findGlobalTags(): Promise<Tag[]> {
    return prisma.tag.findMany({
      where: { 
        projectId: null as any
      },
      orderBy: { value: 'asc' }
    });
  }

  /**
   * Create a new tag
   */
  async create(data: TagCreateInput): Promise<Tag> {
    return prisma.tag.create({
      data: {
        value: data.value.toLowerCase().trim(),
        label: data.label || data.value.trim(),
        projectId: data.projectId as any
      }
    });
  }

  /**
   * Update a tag
   */
  async update(id: string, data: { label?: string }): Promise<Tag> {
    return prisma.tag.update({
      where: { id },
      data
    });
  }

  /**
   * Delete a tag
   */
  async delete(id: string): Promise<Tag> {
    return prisma.tag.delete({
      where: { id }
    });
  }

  /**
   * Create or find a tag by value and project
   */
  async createOrFind(data: TagCreateInput): Promise<Tag> {
    const existingTag = await this.findByValueAndProject(
      data.value.toLowerCase().trim(), 
      data.projectId || null
    );

    if (existingTag) {
      return existingTag;
    }

    return this.create(data);
  }

  /**
   * Create multiple tags from a comma-separated string
   */
  async createFromString(tagsString: string, projectId?: string): Promise<Tag[]> {
    if (!tagsString.trim()) {
      return [];
    }

    const tagValues = tagsString
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);

    const tags: Tag[] = [];

    for (const value of tagValues) {
      const tag = await this.createOrFind({
        value,
        projectId
      });
      tags.push(tag);
    }

    return tags;
  }
} 