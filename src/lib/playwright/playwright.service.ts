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

// Register handlebar helpers
Handlebars.registerHelper('any', function(array: any[], prop: string, value: any) {
  if (!array || !array.length) return false;
  return array.some(item => item[prop] === value);
});

Handlebars.registerHelper('eq', function(a: any, b: any) {
  return a === b;
});

Handlebars.registerHelper('add', function(a: number, b: number) {
  return a + b;
});

export class PlaywrightService {
  private readonly projectRoot: string;
  private readonly templatePath: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    const appRoot = process.cwd();
    this.templatePath = path.join(appRoot, 'src', 'template');
    
    // Register Handlebars helpers globally
    Handlebars.registerHelper('add', (a, b) => a + b);
    Handlebars.registerHelper('eq', (a, b) => a === b);
    Handlebars.registerHelper('any', (array, property, value) => {
      if (!array) return false;
      return array.some((item: any) => item[property] === value);
    });
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
      await execAsync('npx create-playwright@latest --quiet --install-deps', {
        cwd: projectPath,
      });

      // Remove default test folders
      await fs.rm(path.join(projectPath, 'tests'), { recursive: true, force: true });
      await fs.rm(path.join(projectPath, 'tests-examples'), { recursive: true, force: true });

      // Create new folders
      await fs.mkdir(path.join(projectPath, 'fixtures'), { recursive: true });
      await fs.mkdir(path.join(projectPath, 'tests'), { recursive: true });
      
      // Create index.ts in fixtures folder
      const fixturesIndexPath = path.join(projectPath, 'fixtures', 'index.ts');
      await fs.writeFile(fixturesIndexPath, '// Fixtures export file\n', 'utf8');

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
      fixtureId?: string;
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
    type: 'extend' | 'inline' | 'inlineExtend';
    description?: string;
    exportName: string;
    content: string;
    outputPath: string;
  }): Promise<void> {
    const template = await this.loadTemplate('fixture');
    const content = template(params);
    await fs.writeFile(params.outputPath, content, 'utf-8');
    
    // Add fixture export to index.ts
    const fixturesDir = path.dirname(params.outputPath);
    const indexPath = path.join(fixturesDir, 'index.ts');
    
    try {
      // Check if index.ts exists, create it if not
      try {
        await fs.access(indexPath);
      } catch {
        await fs.writeFile(indexPath, '// Fixtures export file\n', 'utf8');
      }
      
      // Read current content
      const indexContent = await fs.readFile(indexPath, 'utf8');
      
      // Generate export statement
      const relativePath = `./${path.basename(params.outputPath, '.ts')}`;
      const exportLine = `export { test as ${params.exportName} } from '${relativePath}';\n`;
      
      // Add export if it doesn't exist already
      if (!indexContent.includes(exportLine)) {
        await fs.writeFile(indexPath, indexContent + exportLine, 'utf8');
      }
    } catch (error: any) {
      console.warn(`Warning: Could not update index.ts: ${error.message}`);
    }
  }
} 