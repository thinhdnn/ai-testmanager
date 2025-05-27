import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { TagRepository } from '@/lib/db/repositories/tag-repository';

// GET /api/projects/[id]/tags
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const paramsCopy = await Promise.resolve(params);
    const projectId = paramsCopy.id;
    const tagRepository = new TagRepository();
    
    // First try to get tags from the Tag model for this project
    const projectTags = await tagRepository.findByProject(projectId);
    
    // Also get global tags (tags with null projectId)
    const globalTags = await tagRepository.findGlobalTags();
    
    // Combine project-specific and global tags
    const allTags = [...projectTags, ...globalTags];
    
    if (allTags.length > 0) {
      // Format tags for response and remove duplicates
      const tagMap = new Map();
      
      allTags.forEach(tag => {
        if (!tagMap.has(tag.value)) {
          tagMap.set(tag.value, {
        value: tag.value,
        label: tag.label || tag.value
          });
        }
      });
      
      const formattedTags = Array.from(tagMap.values());
      return NextResponse.json(formattedTags);
    }
    
    // If no tags found in the Tag model, extract them from test cases
    const testCases = await prisma.testCase.findMany({
      where: { 
        projectId,
        tags: { not: null }
      },
      select: { tags: true },
    });
    
    // Extract unique tags from test cases
    const tagSet = new Set<string>();
    
    testCases.forEach(testCase => {
      if (!testCase.tags) return;
      
      const caseTags = testCase.tags.split(',').map(tag => tag.trim());
      caseTags.forEach(tag => {
        if (tag) tagSet.add(tag);
      });
    });
    
    // Convert to array and format response
    const tagList = Array.from(tagSet).sort().map(tag => ({
      value: tag,
      label: tag
    }));
    
    return NextResponse.json(tagList);
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/tags
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const paramsCopy = await Promise.resolve(params);
    const projectId = paramsCopy.id;
    const tagRepository = new TagRepository();
    const data = await request.json();
    
    if (!data.value && !data.tags) {
      return NextResponse.json(
        { error: 'Tag value or tags string is required' },
        { status: 400 }
      );
    }
    
    if (data.tags) {
      // Create multiple tags from a comma-separated string
      const createdTags = await tagRepository.createFromString(data.tags, projectId);
      
      // Format tags for response
      const formattedTags = createdTags.map(tag => ({
        value: tag.value,
        label: tag.label || tag.value
      }));
      
      return NextResponse.json(formattedTags, { status: 201 });
    } else {
      // Create a single tag
      const tag = await tagRepository.createOrFind({
        value: data.value,
        label: data.label || data.value,
        projectId
      });
      
      return NextResponse.json({
        value: tag.value,
        label: tag.label || tag.value
      }, { status: 201 });
    }
  } catch (error) {
    console.error('Error creating tags:', error);
    return NextResponse.json(
      { error: 'Failed to create tags' },
      { status: 500 }
    );
  }
} 