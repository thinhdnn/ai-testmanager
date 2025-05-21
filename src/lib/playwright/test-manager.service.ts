import { PrismaClient, TestCase, Fixture, Step } from '@prisma/client';
import { PlaywrightService } from './playwright.service';
import * as path from 'path';
import * as fs from 'fs/promises';

export class TestManagerService {
  private prisma: PrismaClient;
  private playwrightService: PlaywrightService;

  constructor(projectRoot: string) {
    this.prisma = new PrismaClient();
    this.playwrightService = new PlaywrightService(projectRoot);
  }

  // Helper function to slugify a name for file naming
  private slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
      .replace(/^-|-$/g, '')       // Remove leading/trailing hyphens
      || 'test';                   // Fallback if name is empty after processing
  }

  async createTestFile(testCaseId: string, useIdAsFilename: boolean = false): Promise<void> {
    const testCase = await this.prisma.testCase.findUnique({
      where: { id: testCaseId },
      include: {
        Steps: {
          orderBy: { order: 'asc' },
        },
        project: true,
      },
    });

    if (!testCase || !testCase.project.playwrightProjectPath) {
      throw new Error('Test case or project path not found');
    }

    const fixtures = await this.getTestFixtures(testCaseId);
    
    // Convert relative project path to absolute path
    const appRoot = process.cwd();
    const absoluteProjectPath = path.join(appRoot, testCase.project.playwrightProjectPath);
    
    // Create filename based on settings
    let filename;
    if (useIdAsFilename) {
      filename = `${testCaseId}.spec.ts`;
    } else {
      filename = `${this.slugify(testCase.name)}.spec.ts`;
    }
    
    // Create absolute path for writing the file
    const absoluteTestFilePath = path.join(
      absoluteProjectPath,
      'tests',
      filename
    );
    
    // Create relative path for storing in database
    const relativeTestFilePath = path.join(
      'tests',
      filename
    );
    
    // Kiểm tra xem tên file có thay đổi hay không
    if (testCase.testFilePath && testCase.testFilePath !== relativeTestFilePath) {
      try {
        // Xóa file cũ nếu tồn tại
        const oldAbsolutePath = path.join(
          absoluteProjectPath,
          testCase.testFilePath
        );
        await fs.access(oldAbsolutePath);
        await fs.unlink(oldAbsolutePath);
        console.log(`Removed old test file: ${oldAbsolutePath}`);
      } catch (error: any) {
        // Nếu file không tồn tại hoặc có lỗi khác, ghi log và tiếp tục
        console.warn(`Could not remove old test file: ${error.message}`);
      }
    }

    // Create a map of fixtures by ID for faster lookup
    const fixtureMap = new Map(fixtures.map(f => [f.id, f]));

    await this.playwrightService.generateTestFile({
      testCaseName: testCase.name,
      fixtures: fixtures.map(fixture => ({
        name: fixture.name,
        path: fixture.fixtureFilePath || '',
        mode: fixture.type as 'extend' | 'inline',
      })),
      steps: testCase.Steps.map(step => ({
        order: step.order,
        action: step.action,
        playwrightCode: step.playwrightScript || '',
        expected: step.expected || undefined,
        disabled: step.disabled,
        fixtureId: step.fixtureId || undefined
      })),
      tags: testCase.tags ? testCase.tags.split(',') : undefined,
      outputPath: absoluteTestFilePath,
    });

    // Store the relative path in the database
    await this.prisma.testCase.update({
      where: { id: testCaseId },
      data: { testFilePath: relativeTestFilePath },
    });
  }

  async createFixtureFile(fixtureId: string): Promise<void> {
    const fixture = await this.prisma.fixture.findUnique({
      where: { id: fixtureId },
      include: {
        project: true,
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!fixture || !fixture.project.playwrightProjectPath) {
      throw new Error('Fixture or project path not found');
    }

    // Convert relative project path to absolute path
    const appRoot = process.cwd();
    const absoluteProjectPath = path.join(appRoot, fixture.project.playwrightProjectPath);

    // Ensure filename follows the pattern: lowercase-name.fixture.ts
    let fixtureFileName: string;
    
    if (fixture.filename) {
      // Remove all extensions to get the base name
      let baseName = fixture.filename.toLowerCase();
      
      // Remove common extensions that might be present
      baseName = baseName
        .replace(/\.fixture\.ts$/, '')
        .replace(/\.fixture\.js$/, '')
        .replace(/\.fixture$/, '')
        .replace(/\.ts$/, '')
        .replace(/\.js$/, '');
      
      fixtureFileName = `${baseName}.fixture.ts`;
    } else {
      // Always generate filename from fixture name for consistency
      fixtureFileName = `${fixture.name.toLowerCase().replace(/\s+/g, '-')}.fixture.ts`;
    }
    
    // Create absolute file path for writing the file
    const absoluteFixtureFilePath = path.join(
      absoluteProjectPath,
      'fixtures',
      fixtureFileName
    );

    // Create relative path for storing in database
    const relativeFixtureFilePath = path.join(
      'fixtures',
      fixtureFileName
    );

    const content = this.generateFixtureContent(fixture);
    
    // Ensure exportName follows camelCase convention and doesn't contain spaces
    let exportName = fixture.exportName || '';
    if (!exportName || exportName.includes(' ')) {
      // Convert to camelCase if exportName is empty or contains spaces
      exportName = fixture.name
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove special characters
        .replace(/\s+(.)/g, (_, c) => c.toUpperCase()) // Convert to camelCase
        .replace(/\s/g, '') // Remove spaces
        .replace(/^(.)/, (_, c) => c.toLowerCase()); // Ensure first character is lowercase
    }

    await this.playwrightService.generateFixtureFile({
      name: fixture.name,
      type: fixture.type as 'extend' | 'inline' | 'inlineExtend',
      description: fixture.name,
      exportName: exportName,
      content,
      outputPath: absoluteFixtureFilePath,
    });

    // Store the relative path in the database
    await this.prisma.fixture.update({
      where: { id: fixtureId },
      data: { fixtureFilePath: relativeFixtureFilePath },
    });
  }

  private async getTestFixtures(testCaseId: string): Promise<Fixture[]> {
    // Get steps that directly reference fixtures
    const steps = await this.prisma.step.findMany({
      where: { testCaseId },
      include: { fixture: true },
    });

    // Extract fixtures from steps that have fixtureId
    const fixtures = steps
      .map(step => step.fixture)
      .filter((fixture): fixture is Fixture => fixture !== null);

    // Remove duplicates by mapping to an object by ID first then converting back to array
    return Array.from(new Map(fixtures.map(f => [f.id, f])).values());
  }

  private generateFixtureContent(fixture: Fixture & { steps: Step[] }): string {
    console.log(`Generating fixture content for fixture: ${fixture.name}, ID: ${fixture.id}`);
    console.log(`Number of steps: ${fixture.steps.length}`);
    
    // If no steps, return placeholder comment
    if (fixture.steps.length === 0) {
      return '// Add your fixture implementation here';
    }
    
    // Format identical to how test.template formats steps
    const scriptLines: string[] = [];
    
    fixture.steps.forEach((step, index) => {
      // Add a blank line before each step, except for the first step
      if (index > 0) {
        scriptLines.push('');
      }
      
      // Comment with step number and action
      scriptLines.push(`// Step ${index + 1}: ${step.action}`);
      
      if (step.disabled) {
        // Handle disabled step
        scriptLines.push(`/* DISABLED STEP`);
        if (step.playwrightScript && step.playwrightScript.trim() !== '') {
          // Use the playwrightScript if available
          scriptLines.push(step.playwrightScript);
        } else {
          // Fallback to TODO comment if no script available
          scriptLines.push(`// TODO: Implement this step`);
        }
        if (step.expected) {
          scriptLines.push(`// Expected: ${step.expected}`);
        }
        scriptLines.push(`*/`);
      } else {
        // Use playwrightScript if available, otherwise use TODO comment
        if (step.playwrightScript && step.playwrightScript.trim() !== '') {
          scriptLines.push(step.playwrightScript);
        } else {
          scriptLines.push(`// TODO: Implement this step`);
        }
        
        // Add expected result as comment if available
        if (step.expected) {
          scriptLines.push(`// Expected: ${step.expected}`);
        }
      }
    });
    
    console.log(`Generated script lines: ${scriptLines.length}`);
    return scriptLines.join('\n');
  }

  async renameFixtureFile(fixtureId: string, oldName: string, newName: string): Promise<string | null> {
    const fixture = await this.prisma.fixture.findUnique({
      where: { id: fixtureId },
      include: {
        project: true,
      },
    });

    if (!fixture || !fixture.project.playwrightProjectPath || !fixture.fixtureFilePath) {
      console.warn(`Cannot rename fixture file: missing data for fixture ${fixtureId}`);
      return null;
    }

    // Convert relative project path to absolute path
    const appRoot = process.cwd();
    const absoluteProjectPath = path.join(appRoot, fixture.project.playwrightProjectPath);

    // Get the old absolute path
    const oldAbsolutePath = path.join(
      absoluteProjectPath,
      fixture.fixtureFilePath
    );

    // Generate new filename based on the new fixture name
    const newFileName = `${newName.toLowerCase().replace(/\s+/g, '-')}.fixture.ts`;
    
    // Create new relative and absolute paths
    const newRelativeFixtureFilePath = path.join(
      'fixtures',
      newFileName
    );
    const newAbsolutePath = path.join(
      absoluteProjectPath,
      newRelativeFixtureFilePath
    );

    try {
      // Check if old file exists
      await fs.access(oldAbsolutePath);
      
      // Read the content of the old file
      const content = await fs.readFile(oldAbsolutePath, 'utf8');
      
      // Write content to the new file location
      await fs.mkdir(path.dirname(newAbsolutePath), { recursive: true });
      await fs.writeFile(newAbsolutePath, content);
      
      // Delete the old file
      await fs.unlink(oldAbsolutePath);
      
      console.log(`Renamed fixture file from ${oldAbsolutePath} to ${newAbsolutePath}`);
      
      // Update the fixtureFilePath in the database
      await this.prisma.fixture.update({
        where: { id: fixtureId },
        data: { fixtureFilePath: newRelativeFixtureFilePath },
      });
      
      return newRelativeFixtureFilePath;
    } catch (error: any) {
      console.error(`Error renaming fixture file: ${error.message}`);
      
      // If error occurs, regenerate the file completely at the new location
      // This will use the updated fixture data including new name and exportName
      await this.createFixtureFile(fixtureId);
      return newRelativeFixtureFilePath;
    }
  }

  async initializePlaywrightProject(projectId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Get the absolute path from createPlaywrightProject
    const absolutePlaywrightProjectPath = await this.playwrightService.createPlaywrightProject(
      projectId,
      project.name
    );
    
    // Create a relative path from the absolute path
    const appRoot = process.cwd();
    let relativePlaywrightProjectPath = path.relative(appRoot, absolutePlaywrightProjectPath);
    
    // On Windows, convert backslashes to forward slashes for consistency
    relativePlaywrightProjectPath = relativePlaywrightProjectPath.replace(/\\/g, '/');
    
    console.log(`Storing relative Playwright project path: ${relativePlaywrightProjectPath}`);

    // Store the relative path in the database
    await this.prisma.project.update({
      where: { id: projectId },
      data: { playwrightProjectPath: relativePlaywrightProjectPath },
    });
  }

  /**
   * Add a step to an existing fixture and regenerate the fixture file
   */
  async addFixtureStep(fixtureId: string, stepData: {
    order: number;
    action: string;
    playwrightScript?: string;
    disabled?: boolean;
  }): Promise<Step> {
    // Create the step in the database
    const step = await this.prisma.step.create({
      data: {
        fixtureId,
        order: stepData.order,
        action: stepData.action,
        playwrightScript: stepData.playwrightScript || '', // Make playwrightScript optional
        disabled: stepData.disabled ?? false,
      },
    });

    // Regenerate the fixture file with the new step
    await this.createFixtureFile(fixtureId);
    
    return step;
  }

  /**
   * Update an existing step in a fixture and regenerate the fixture file
   */
  async updateFixtureStep(stepId: string, stepData: {
    order?: number;
    action?: string;
    playwrightScript?: string;
    disabled?: boolean;
  }): Promise<Step> {
    // First get the step to find its fixtureId
    const existingStep = await this.prisma.step.findUnique({
      where: { id: stepId },
    });

    if (!existingStep || !existingStep.fixtureId) {
      throw new Error('Step not found or not associated with a fixture');
    }

    // Ensure playwrightScript is handled properly - if undefined, keep existing value
    const updateData = {
      ...stepData
    };

    // If playwrightScript is provided but empty, set it to empty string
    if (stepData.playwrightScript !== undefined) {
      updateData.playwrightScript = stepData.playwrightScript || '';
    }

    // Update the step in the database
    const updatedStep = await this.prisma.step.update({
      where: { id: stepId },
      data: updateData,
    });

    // Regenerate the fixture file with the updated step
    await this.createFixtureFile(existingStep.fixtureId);
    
    return updatedStep;
  }

  /**
   * Delete a step from a fixture and regenerate the fixture file
   */
  async deleteFixtureStep(stepId: string): Promise<void> {
    // First get the step to find its fixtureId
    const step = await this.prisma.step.findUnique({
      where: { id: stepId },
    });

    if (!step || !step.fixtureId) {
      throw new Error('Step not found or not associated with a fixture');
    }

    const fixtureId = step.fixtureId;

    // Delete the step from the database
    await this.prisma.step.delete({
      where: { id: stepId },
    });

    // Regenerate the fixture file without the deleted step
    await this.createFixtureFile(fixtureId);
  }

  /**
   * Get all steps for a fixture
   */
  async getFixtureSteps(fixtureId: string): Promise<Step[]> {
    return this.prisma.step.findMany({
      where: { fixtureId },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Reorder steps in a fixture and regenerate the fixture file
   */
  async reorderFixtureSteps(fixtureId: string, stepIds: string[]): Promise<void> {
    // Update the order of each step based on its position in the stepIds array
    for (let i = 0; i < stepIds.length; i++) {
      await this.prisma.step.update({
        where: { id: stepIds[i] },
        data: { order: i + 1 },
      });
    }

    // Regenerate the fixture file with the reordered steps
    await this.createFixtureFile(fixtureId);
  }
} 