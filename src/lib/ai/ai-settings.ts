import { prisma } from "@/lib/db";

export interface AISettings {
  // Selected AI provider
  ai_provider: string;

  // Auto use AI suggestion setting
  auto_use_ai_suggestion: boolean;

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

  // Cached models (JSON strings)
  cached_openai_models?: string;
  cached_gemini_models?: string;
  cached_claude_models?: string;
  cached_grok_models?: string;
}

// Define AIServiceType based on available providers
export type AIServiceType = "openai" | "gemini" | "claude" | "grok";

// Environment variables constants
const ENV = {
  AI_PROVIDER: process.env.AI_PROVIDER || "gemini",
  
  // Auto use AI suggestion
  AUTO_USE_AI_SUGGESTION: process.env.AUTO_USE_AI_SUGGESTION === "true" || true,
  
  // Gemini
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-pro",
  
  // OpenAI
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-4o",
  
  // Grok
  GROK_API_KEY: process.env.GROK_API_KEY || "",
  GROK_API_ENDPOINT: process.env.GROK_API_ENDPOINT || "https://api.x.ai/v1",
  GROK_MODEL: process.env.GROK_MODEL || "grok-2-latest",
  
  // Claude
  CLAUDE_API_KEY: process.env.CLAUDE_API_KEY || "",
  CLAUDE_API_ENDPOINT: process.env.CLAUDE_API_ENDPOINT || "https://api.anthropic.com/v1",
  CLAUDE_MODEL: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022",
} as const;

// Default settings
const defaultAISettings: AISettings = {
  ai_provider: ENV.AI_PROVIDER,

  // Auto use AI suggestion setting
  auto_use_ai_suggestion: ENV.AUTO_USE_AI_SUGGESTION,

  // Gemini settings
  gemini_api_key: ENV.GEMINI_API_KEY,
  gemini_model: ENV.GEMINI_MODEL,

  // OpenAI settings
  openai_api_key: ENV.OPENAI_API_KEY,
  openai_model: ENV.OPENAI_MODEL,

  // Grok settings
  grok_api_key: ENV.GROK_API_KEY,
  grok_api_endpoint: ENV.GROK_API_ENDPOINT,
  grok_model: ENV.GROK_MODEL,

  // Claude settings
  claude_api_key: ENV.CLAUDE_API_KEY,
  claude_api_endpoint: ENV.CLAUDE_API_ENDPOINT,
  claude_model: ENV.CLAUDE_MODEL,
};

/**
 * Fetches AI settings from the database with fallback to environment variables
 */
export async function getAISettings(): Promise<AISettings> {
  try {
    console.log("Fetching AI settings from database...");
    const settingsFromDB = await prisma.setting.findMany({
      where: {
        key: {
          in: [
            "ai_provider",
            "auto_use_ai_suggestion",
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
            "cached_openai_models",
            "cached_gemini_models",
            "cached_claude_models",
            "cached_grok_models",
          ],
        },
      },
    });

    console.log("Settings from DB:", settingsFromDB);

    // Create settings object with defaults
    const settings: AISettings = { ...defaultAISettings };

    // Apply any settings from the database
    settingsFromDB.forEach((setting) => {
      // Type assertion to ensure TypeScript knows these are valid keys
      const key = setting.key as keyof AISettings;
      if (key === 'auto_use_ai_suggestion') {
        settings[key] = setting.value === 'true';
      } else {
        // Only use the database value if it's not empty
        if (setting.value) {
          settings[key] = setting.value;
        }
      }
    });

    // Only override with environment variables if they are explicitly set AND there is no database value
    if (process.env.GEMINI_API_KEY && !settings.gemini_api_key) settings.gemini_api_key = ENV.GEMINI_API_KEY;
    if (process.env.GEMINI_MODEL && !settings.gemini_model) settings.gemini_model = ENV.GEMINI_MODEL;
    if (process.env.OPENAI_API_KEY && !settings.openai_api_key) settings.openai_api_key = ENV.OPENAI_API_KEY;
    if (process.env.OPENAI_MODEL && !settings.openai_model) settings.openai_model = ENV.OPENAI_MODEL;
    if (process.env.GROK_API_KEY && !settings.grok_api_key) settings.grok_api_key = ENV.GROK_API_KEY;
    if (process.env.GROK_API_ENDPOINT && !settings.grok_api_endpoint) settings.grok_api_endpoint = ENV.GROK_API_ENDPOINT;
    if (process.env.GROK_MODEL && !settings.grok_model) settings.grok_model = ENV.GROK_MODEL;
    if (process.env.CLAUDE_API_KEY && !settings.claude_api_key) settings.claude_api_key = ENV.CLAUDE_API_KEY;
    if (process.env.CLAUDE_API_ENDPOINT && !settings.claude_api_endpoint) settings.claude_api_endpoint = ENV.CLAUDE_API_ENDPOINT;
    if (process.env.CLAUDE_MODEL && !settings.claude_model) settings.claude_model = ENV.CLAUDE_MODEL;

    console.log("Final settings:", settings);

    return settings;
  } catch (error) {
    console.error("Error fetching AI settings:", error);
    return defaultAISettings;
  }
}

/**
 * Check if auto use AI suggestion is enabled
 */
export async function isAutoUseAISuggestionEnabled(): Promise<boolean> {
  try {
    const settings = await getAISettings();
    return settings.auto_use_ai_suggestion ?? true;
  } catch (error) {
    console.error("Error checking auto use AI suggestion setting:", error);
    return true; // Default to enabled
  }
}
