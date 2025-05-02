import { getAIService } from "./ai-service";
import { getAISettings, AIServiceType } from "./ai-settings";

// Định nghĩa interface chung cho tất cả các AI providers
export interface AIProvider {
  // Core functionality
  generatePlaywrightFromSteps(
    testCaseName: string,
    testSteps: Array<{
      id: string;
      order: number;
      action: string;
      data?: string | null;
      expected?: string | null;
    }>,
    existingCode?: string,
    options?: {
      preserveImports?: boolean;
      preserveFixtures?: boolean;
      preserveSetup?: boolean;
      preserveTeardown?: boolean;
      tags?: string[];
      provider?: AIServiceType;
    }
  ): Promise<string>;

  // Additional common methods
  extractJSONFromText(text: string, provider?: AIServiceType): Record<string, unknown>;

  generatePlaywrightTestStep(request: Record<string, unknown>, provider?: AIServiceType): Promise<Record<string, unknown>>;
  generatePlaywrightTestStepWithHTML(request: Record<string, unknown>, provider?: AIServiceType): Promise<Record<string, unknown>>;
  analyzeAndGenerateTestStep(description: string, provider?: AIServiceType): Promise<Record<string, unknown>>;
  generatePlaywrightCodeFromStep(
    stepAction: string,
    stepData?: string | null,
    stepExpected?: string | null,
    provider?: AIServiceType
  ): Promise<string>;
  analyzePlaywrightCode(playwrightCode: string, provider?: AIServiceType): Promise<Record<string, unknown>>;

  // Spelling and vocabulary correction
  fixSpellingAndVocabulary(text: string, provider?: AIServiceType): Promise<string>;

  // New method
  fixTestCaseName(testCaseName: string, provider?: AIServiceType): Promise<string>;
}

// Singleton instance
let aiProviderInstance: AIProvider | null = null;
let currentProviderType: AIServiceType | null = null;

/**
 * Reset the AI provider instance, forcing it to be recreated on next use
 */
export function resetAIProvider() {
  aiProviderInstance = null;
  currentProviderType = null;
}

/**
 * Get the current AI provider type from settings
 */
export async function getAIProviderType(): Promise<AIServiceType> {
  const settings = await getAISettings();
  return (settings.ai_provider as AIServiceType) || "gemini";
}

/**
 * Get the configured AI service based on settings
 */
export async function getAIProvider() {
  try {
    const providerType = await getAIProviderType();

    // If provider type has changed or instance doesn't exist, create a new one
    if (providerType !== currentProviderType || !aiProviderInstance) {
      currentProviderType = providerType;
      aiProviderInstance = await getAIService();
    }

    return aiProviderInstance;
  } catch (error) {
    console.error("Error getting AI provider:", error);
    // Create minimal provider with basic functionality
    return createFallbackProvider();
  }
}

// Fallback provider implementation
function createFallbackProvider(): AIProvider {
  return {
    generatePlaywrightFromSteps: async () => {
      throw new Error("AI service not available");
    },
    extractJSONFromText: () => ({}),
    generatePlaywrightTestStep: async () => {
      throw new Error("AI service not available");
    },
    generatePlaywrightTestStepWithHTML: async () => {
      throw new Error("AI service not available");
    },
    analyzeAndGenerateTestStep: async () => {
      throw new Error("AI service not available");
    },
    generatePlaywrightCodeFromStep: async () => {
      throw new Error("AI service not available");
    },
    analyzePlaywrightCode: async () => {
      throw new Error("AI service not available");
    },
    fixSpellingAndVocabulary: async () => {
      throw new Error("AI service not available");
    },
    fixTestCaseName: async () => {
      throw new Error("AI service not available");
    },
  };
}
