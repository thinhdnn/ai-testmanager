import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import Handlebars from 'handlebars';
import { PLAYWRIGHT_PROJECT_PATH } from '@/lib/utils/config';

const execAsync = promisify(exec);

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

// Add capitalize helper
Handlebars.registerHelper('capitalize', function(str: string) {
  if (typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
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
    Handlebars.registerHelper('capitalize', (str) => {
      if (typeof str !== 'string') return '';
      return str.charAt(0).toUpperCase() + str.slice(1);
    });
  }

  private async updatePlaywrightConfig(projectPath: string) {
    const configPath = path.join(projectPath, 'playwright.config.ts');
    
    // Read existing config file
    const content = await fs.readFile(configPath, 'utf8');
    
    // Replace or add the use configuration
    const updatedContent = content.replace(
      /use:\s*{[^}]*}/,
      `use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    video: (process.env.VIDEO_MODE) as any || 'off',
    screenshot: (process.env.SCREENSHOT_MODE) as any || 'off',
    trace: 'on-first-retry'
  }`
    );

    await fs.writeFile(configPath, updatedContent, 'utf8');
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
      
      // Create index.ts in fixtures folder using our template
      await this.updateFixturesIndexFile(path.join(projectPath, 'fixtures'), []);

      // Update playwright.config.ts with custom configuration
      await this.updatePlaywrightConfig(projectPath);

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
      exportName: string;
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

  async updateFixturesIndexFile(fixturesDir: string, fixtures: Array<{importName: string, fileName: string, exportName?: string}>): Promise<void> {
    const indexPath = path.join(fixturesDir, 'index.ts');
    
    try {
      const template = await this.loadTemplate('index.fixture');
      const content = template({ fixtures });
      await fs.writeFile(indexPath, content, 'utf-8');
      console.log(`Updated fixtures index file at ${indexPath}`);
    } catch (error: any) {
      console.warn(`Warning: Could not update index.ts: ${error.message}`);
    }
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
    
    // Add fixture to index.ts
    const fixturesDir = path.dirname(params.outputPath);
    const fixtureFileName = path.basename(params.outputPath, '.ts');
    const fixtureImportName = `${params.exportName}Fixture`;
    
    try {
      // Get all existing fixtures in the directory
      const files = await fs.readdir(fixturesDir);
      const fixtureFiles = files.filter(file => 
        file.endsWith('.fixture.ts') && file !== 'index.ts'
      );
      
      // Create fixture data array for template
      const fixtures = fixtureFiles.map(file => {
        const fileName = file.replace(/\.ts$/, '');
        const exportName = fileName.replace(/\-([a-z])/g, (_, c) => c.toUpperCase()).replace(/\.fixture$/, '');
        return {
          importName: `${exportName}Fixture`,
          fileName: fileName,
          exportName: exportName
        };
      });
      
      // Ensure our new fixture is included
      if (!fixtures.some(f => f.importName === fixtureImportName)) {
        fixtures.push({
          importName: fixtureImportName,
          fileName: fixtureFileName,
          exportName: params.exportName
        });
      }
      
      // Update the index.ts file
      await this.updateFixturesIndexFile(fixturesDir, fixtures);
    } catch (error: any) {
      console.warn(`Warning: Could not update index.ts: ${error.message}`);
    }
  }

  async removeFixtureFromIndex(fixturesDir: string, fixtureFileName: string): Promise<void> {
    try {
      // Get all existing fixtures in the directory
      const files = await fs.readdir(fixturesDir);
      const fixtureFiles = files.filter(file => 
        file.endsWith('.fixture.ts') && file !== 'index.ts' && file !== `${fixtureFileName}.ts`
      );
      
      // Create fixture data array for template without the removed fixture
      const fixtures = fixtureFiles.map(file => {
        const fileName = file.replace(/\.ts$/, '');
        const exportName = fileName.replace(/\-([a-z])/g, (_, c) => c.toUpperCase()).replace(/\.fixture$/, '');
        return {
          importName: `${exportName}Fixture`,
          fileName: fileName,
          exportName: exportName
        };
      });
      
      // Update the index.ts file
      await this.updateFixturesIndexFile(fixturesDir, fixtures);
      console.log(`Removed fixture ${fixtureFileName} from index.ts`);
    } catch (error: any) {
      console.warn(`Warning: Could not update index.ts after removing fixture: ${error.message}`);
    }
  }
} 