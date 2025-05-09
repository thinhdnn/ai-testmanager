import { PrismaClient, TestCase, Fixture, Step } from '@prisma/client';
import { PlaywrightService } from './playwright.service';
import * as path from 'path';

export class TestManagerService {
  private prisma: PrismaClient;
  private playwrightService: PlaywrightService;

  constructor(projectRoot: string) {
    this.prisma = new PrismaClient();
    this.playwrightService = new PlaywrightService(projectRoot);
  }

  async createTestFile(testCaseId: string): Promise<void> {
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
    const testFilePath = path.join(
      testCase.project.playwrightProjectPath,
      'tests',
      `${testCase.name.toLowerCase().replace(/\s+/g, '-')}.spec.ts`
    );

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
      })),
      tags: testCase.tags ? testCase.tags.split(',') : undefined,
      outputPath: testFilePath,
    });

    await this.prisma.testCase.update({
      where: { id: testCaseId },
      data: { testFilePath },
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

    const fixtureFilePath = path.join(
      fixture.project.playwrightProjectPath,
      'fixtures',
      `${fixture.name.toLowerCase().replace(/\s+/g, '-')}.fixture.ts`
    );

    const content = this.generateFixtureContent(fixture);

    await this.playwrightService.generateFixtureFile({
      name: fixture.name,
      type: fixture.type as 'data' | 'page',
      description: fixture.name,
      exportName: fixture.exportName || fixture.name,
      content,
      outputPath: fixtureFilePath,
    });

    await this.prisma.fixture.update({
      where: { id: fixtureId },
      data: { fixtureFilePath },
    });
  }

  private async getTestFixtures(testCaseId: string): Promise<Fixture[]> {
    const steps = await this.prisma.step.findMany({
      where: { testCaseId },
      include: { fixture: true },
    });

    const fixtures = steps
      .map(step => step.fixture)
      .filter((fixture): fixture is Fixture => fixture !== null);

    return Array.from(new Map(fixtures.map(f => [f.id, f])).values());
  }

  private generateFixtureContent(fixture: Fixture & { steps: Step[] }): string {
    return fixture.steps
      .map(step => step.playwrightScript || '')
      .filter(script => script)
      .join('\n');
  }

  async initializePlaywrightProject(projectId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const playwrightProjectPath = await this.playwrightService.createPlaywrightProject(
      projectId,
      project.name
    );

    await this.prisma.project.update({
      where: { id: projectId },
      data: { playwrightProjectPath },
    });
  }
} 