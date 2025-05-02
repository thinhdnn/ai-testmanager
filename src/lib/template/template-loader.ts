import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';

/**
 * Template types supported by the application
 */
export type TemplateType = 'test' | 'fixture';

/**
 * Load a template from the template directory
 */
export async function loadTemplate(type: TemplateType): Promise<string> {
  const templatePath = path.join(process.cwd(), 'src', 'template', `${type}.template`);
  
  try {
    const template = await fs.promises.readFile(templatePath, 'utf-8');
    return template;
  } catch (error) {
    console.error(`Error loading template ${type}:`, error);
    throw new Error(`Failed to load template: ${type}`);
  }
}

/**
 * Render a template with the provided data
 */
export function renderTemplate(template: string, data: Record<string, any>): string {
  try {
    const compiledTemplate = Handlebars.compile(template);
    return compiledTemplate(data);
  } catch (error) {
    console.error('Error rendering template:', error);
    throw new Error('Failed to render template');
  }
}

/**
 * Load and render a template with the provided data
 */
export async function processTemplate(type: TemplateType, data: Record<string, any>): Promise<string> {
  const template = await loadTemplate(type);
  return renderTemplate(template, data);
}

/**
 * Save a rendered template to a file
 */
export async function saveRenderedTemplate(content: string, outputPath: string): Promise<string> {
  try {
    // Ensure the directory exists
    const dir = path.dirname(outputPath);
    await fs.promises.mkdir(dir, { recursive: true });
    
    // Write the file
    await fs.promises.writeFile(outputPath, content, 'utf-8');
    return outputPath;
  } catch (error) {
    console.error('Error saving rendered template:', error);
    throw new Error(`Failed to save template to ${outputPath}`);
  }
}