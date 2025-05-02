import { prisma } from "@/lib/db";

export interface AISettings {
  // Selected AI provider
  ai_provider: string;

  // Gemini settings
  gemini_api_key: string;
  gemini_model: string;

  // OpenAI settings
  openai_api_key: string;
  openai_model: string;

  // Grok settings
  grok_api_key: string;
  grok_api_endpoint: string;
  grok_model: string;

  // Claude settings
  claude_api_key: string;
  claude_api_endpoint: string;
  claude_model: string;
}

// Define AIServiceType based on available providers
export type AIServiceType = "openai" | "gemini" | "claude" | "grok";

// Default settings
const defaultAISettings: AISettings = {
  ai_provider: "gemini",

  // Gemini settings
  gemini_api_key: process.env.GEMINI_API_KEY || "",
  gemini_model: process.env.GEMINI_MODEL || "gemini-2.0-flash",

  // OpenAI settings
  openai_api_key: process.env.OPENAI_API_KEY || "",
  openai_model: process.env.OPENAI_MODEL || "gpt-4",

  // Grok settings
  grok_api_key: process.env.GROK_API_KEY || "",
  grok_api_endpoint: process.env.GROK_API_ENDPOINT || "https://api.x.ai/v1",
  grok_model: process.env.GROK_MODEL || "grok-2-latest",

  // Claude settings
  claude_api_key: process.env.CLAUDE_API_KEY || "",
  claude_api_endpoint:
    process.env.CLAUDE_API_ENDPOINT || "https://api.anthropic.com/v1",
  claude_model: process.env.CLAUDE_MODEL || "claude-3-opus-20240229",
};

/**
 * Fetches AI settings from the database with fallback to environment variables
 */
export async function getAISettings(): Promise<AISettings> {
  try {
    const settingsFromDB = await prisma.setting.findMany({
      where: {
        key: {
          in: [
            "ai_provider",
            "gemini_api_key",
            "gemini_model",
            "openai_api_key",
            "openai_model",
            "grok_api_key",
            "grok_api_endpoint",
            "grok_model",
            "claude_api_key",
            "claude_api_endpoint",
            "claude_model",
          ],
        },
      },
    });

    // Create settings object with defaults
    const settings: AISettings = { ...defaultAISettings };

    // Apply any settings from the database
    settingsFromDB.forEach((setting) => {
      // Type assertion to ensure TypeScript knows these are valid keys
      const key = setting.key as keyof AISettings;
      settings[key] = setting.value;
    });

    // Override with environment variables if they exist
    if (process.env.GEMINI_API_KEY)
      settings.gemini_api_key = process.env.GEMINI_API_KEY;
    if (process.env.GEMINI_MODEL)
      settings.gemini_model = process.env.GEMINI_MODEL;
    if (process.env.OPENAI_API_KEY)
      settings.openai_api_key = process.env.OPENAI_API_KEY;
    if (process.env.OPENAI_MODEL)
      settings.openai_model = process.env.OPENAI_MODEL;
    if (process.env.GROK_API_KEY)
      settings.grok_api_key = process.env.GROK_API_KEY;
    if (process.env.GROK_API_ENDPOINT)
      settings.grok_api_endpoint = process.env.GROK_API_ENDPOINT;
    if (process.env.GROK_MODEL) settings.grok_model = process.env.GROK_MODEL;
    if (process.env.CLAUDE_API_KEY)
      settings.claude_api_key = process.env.CLAUDE_API_KEY;
    if (process.env.CLAUDE_API_ENDPOINT)
      settings.claude_api_endpoint = process.env.CLAUDE_API_ENDPOINT;
    if (process.env.CLAUDE_MODEL)
      settings.claude_model = process.env.CLAUDE_MODEL;

    return settings;
  } catch (error) {
    console.error("Error fetching AI settings:", error);
    // Return defaults from environment variables
    return defaultAISettings;
  }
}
