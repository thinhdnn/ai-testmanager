import { z } from 'zod';

/**
 * Test step schema for validation
 */
export const TestStepSchema = z.object({
  order: z.number(),
  action: z.string().min(1, "Action is required"),
  data: z.string().nullable().optional(),
  expected: z.string().nullable().optional(),
  playwrightCode: z.string().min(1, "Playwright code is required"),
});

/**
 * Fixture schema for validation
 */
export const FixtureSchema = z.object({
  name: z.string().min(1, "Fixture name is required"),
  path: z.string().min(1, "Fixture path is required"),
});

/**
 * Setup/teardown step schema
 */
export const SetupStepSchema = z.object({
  comment: z.string(),
  playwrightCode: z.string().min(1, "Playwright code is required"),
});

/**
 * Test template data schema
 */
export const TestTemplateSchema = z.object({
  testCaseName: z.string().min(1, "Test case name is required"),
  fixtures: z.array(FixtureSchema).optional(),
  setup: z.array(SetupStepSchema).optional(),
  steps: z.array(TestStepSchema).min(1, "At least one test step is required"),
  teardown: z.array(SetupStepSchema).optional(),
});

/**
 * Fixture template data schema
 */
export const FixtureTemplateSchema = z.object({
  name: z.string().min(1, "Fixture name is required"),
  type: z.enum(['extend', 'inline', 'inlineExtend']),
  description: z.string().optional(),
  exportName: z.string().min(1, "Export name is required"),
  content: z.string(),
  params: z.string().optional(),
});

/**
 * Validate test template data
 */
export function validateTestTemplate(data: unknown): { success: boolean; errors?: string[] } {
  try {
    TestTemplateSchema.parse(data);
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      return { success: false, errors };
    }
    return { success: false, errors: ['Unknown validation error'] };
  }
}

/**
 * Validate fixture template data
 */
export function validateFixtureTemplate(data: unknown): { success: boolean; errors?: string[] } {
  try {
    FixtureTemplateSchema.parse(data);
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      return { success: false, errors };
    }
    return { success: false, errors: ['Unknown validation error'] };
  }
} 