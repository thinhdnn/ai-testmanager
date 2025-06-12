import { getAIService } from "./ai-service";
import { getAISettings, AIServiceType } from "./ai-settings";

// Định nghĩa interface chung cho tất cả các AI providers
export interface AIProvider {
  // Core functionality that actually exists in AIService
  extractJSONFromText(text: string): any;
  analyzePlaywrightCode(playwrightCode: string, provider?: AIServiceType): Promise<any>;
  analyzeAndGenerateTestStep(description: string, provider?: AIServiceType): Promise<any>;
  analyzeAndGenerateMultipleTestSteps(descriptions: string[], provider?: AIServiceType): Promise<any[]>;
  fixStepText(text: string, provider?: AIServiceType): Promise<string>;
  fixSpellingAndVocabulary(text: string, provider?: AIServiceType): Promise<string>;
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
    extractJSONFromText: () => ({}),
    analyzePlaywrightCode: async () => {
      throw new Error("AI service not available");
    },
    analyzeAndGenerateTestStep: async () => {
      throw new Error("AI service not available");
    },
    analyzeAndGenerateMultipleTestSteps: async () => {
      throw new Error("AI service not available");
    },
    fixStepText: async () => {
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
