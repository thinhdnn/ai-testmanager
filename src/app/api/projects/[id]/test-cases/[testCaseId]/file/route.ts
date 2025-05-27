import { NextResponse } from 'next/server';
import { TestCaseRepository } from '@/lib/db/repositories/test-case-repository';
import { ProjectRepository } from '@/lib/db/repositories/project-repository';
import { PLAYWRIGHT_PROJECT_PATH } from '@/lib/utils/config';
import fs from 'fs/promises';
import path from 'path';
import { sanitizeFolderName } from '@/lib/utils';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; testCaseId: string }> }
) {
  try {
    // Await the dynamic parameters
    const params = await context.params;
    const { id, testCaseId } = params;
    
    const testCaseRepo = new TestCaseRepository();
    const projectRepo = new ProjectRepository();

    // Get both test case and project
    const [testCase, project] = await Promise.all([
      testCaseRepo.findById(testCaseId),
      projectRepo.findById(id)
    ]);

    if (!testCase || !project) {
      return NextResponse.json(
        { error: testCase ? 'Project not found' : 'Test case not found' },
        { status: 404 }
      );
    }

    // Use sanitized project name for the path
    const sanitizedProjectName = sanitizeFolderName(project.name);

    // Resolve the full file path
    let testFilePath;
    if (testCase.testFilePath) {
      // If we have a stored path, resolve it relative to the playwright projects directory
      testFilePath = path.join(process.cwd(), PLAYWRIGHT_PROJECT_PATH, sanitizedProjectName, testCase.testFilePath);
    } else {
      // Fallback to constructed path
      testFilePath = path.join(
        process.cwd(), 
        PLAYWRIGHT_PROJECT_PATH, 
        sanitizedProjectName, 
        'tests', 
        `${testCase.name}.spec.ts`
      );
    }
    
    console.log('Attempting to read test file:', {
      testFilePath,
      testCaseName: testCase.name,
      projectName: project.name,
      sanitizedProjectName,
      storedPath: testCase.testFilePath,
      playwrightPath: PLAYWRIGHT_PROJECT_PATH
    });

    try {
      // Check if file exists first
      const fileExists = await fs.access(testFilePath).then(() => true).catch(() => false);
      console.log('File exists:', fileExists);

      if (!fileExists) {
        console.log('File not found, returning template');
        const template = `import { test, expect } from '@playwright/test';

test('${testCase.name}', async ({ page }) => {
  // Test steps will be generated here
  // Based on your test case configuration
});`;
        return NextResponse.json({ content: template });
      }

      // Try to read the file
      const content = await fs.readFile(testFilePath, 'utf-8');
      console.log('Successfully read file content');
      return NextResponse.json({ content });
    } catch (error) {
      console.error('Error reading test file:', error);
      throw error; // Let the outer catch handle the error
    }
  } catch (error) {
    console.error('Error in route handler:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test file' },
      { status: 500 }
    );
  }
} 