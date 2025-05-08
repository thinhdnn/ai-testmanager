import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import Handlebars from 'handlebars';

const execAsync = promisify(exec);
const PLAYWRIGHT_PROJECT_PATH = process.env.PLAYWRIGHT_PROJECT_PATH || 'playwright-projects';

function sanitizeFolderName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export class PlaywrightService {
  private readonly projectRoot: string;
  private readonly templatePath: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.templatePath = path.join(projectRoot, 'src', 'template');
  }

  async createPlaywrightProject(projectId: string, projectName: string): Promise<string> {
    try {
      // Create base directory if it doesn't exist
      const baseDir = path.join(this.projectRoot, PLAYWRIGHT_PROJECT_PATH);
      await fs.mkdir(baseDir, { recursive: true });

      // Create project specific directory using sanitized name
      const sanitizedName = sanitizeFolderName(projectName);
      const projectPath = path.join(baseDir, sanitizedName);
      await fs.mkdir(projectPath, { recursive: true });

      // Initialize Playwright project
      await execAsync('npx create-playwright@latest --install-deps --quiet', {
        cwd: projectPath,
      });

      return projectPath;
    } catch (error: any) {
      throw new Error(`Failed to create Playwright project: ${error.message}`);
    }
  }

  async loadTemplate(templateName: string): Promise<Handlebars.TemplateDelegate> {
    const templatePath = path.join(this.templatePath, `${templateName}.template`);
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    return Handlebars.compile(templateContent);
  }

  async generateTestFile(params: {
    testCaseName: string;
    fixtures?: Array<{
      name: string;
      path: string;
      mode: 'extend' | 'inline';
    }>;
    steps: Array<{
      order: number;
      action: string;
      playwrightCode: string;
      expected?: string;
      disabled?: boolean;
    }>;
    tags?: string[];
    outputPath: string;
  }): Promise<void> {
    const template = await this.loadTemplate('test');
    const content = template(params);
    await fs.writeFile(params.outputPath, content, 'utf-8');
  }

  async generateFixtureFile(params: {
    name: string;
    type: 'data' | 'page';
    description?: string;
    exportName: string;
    content: string;
    outputPath: string;
  }): Promise<void> {
    const template = await this.loadTemplate('fixture');
    const content = template(params);
    await fs.writeFile(params.outputPath, content, 'utf-8');
  }
} 