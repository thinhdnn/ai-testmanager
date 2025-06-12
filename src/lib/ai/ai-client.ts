import { AISettings, AIServiceType } from "./ai-settings";

/**
 * Client-side AI utilities that call API endpoints instead of server-side functions
 */

/**
 * Fetch AI settings from the API
 */
export async function getAISettingsClient(): Promise<AISettings> {
  try {
    const response = await fetch("/api/ai/settings");
    if (!response.ok) {
      throw new Error("Failed to fetch AI settings");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching AI settings:", error);
    // Return default settings on error
    return {
      ai_provider: "gemini",
      auto_use_ai_suggestion: true,
      gemini_api_key: "",
      gemini_model: "gemini-1.5-flash",
      openai_api_key: "",
      openai_model: "gpt-4o",
      grok_api_key: "",
      grok_api_endpoint: "https://api.x.ai/v1",
      grok_model: "grok-2-latest",
      claude_api_key: "",
      claude_api_endpoint: "https://api.anthropic.com/v1",
      claude_model: "claude-3-5-sonnet-20241022",
    };
  }
}

/**
 * Get AI provider type from client-side settings
 */
export async function getAIProviderTypeClient(): Promise<AIServiceType> {
  try {
    const settings = await getAISettingsClient();
    return (settings.ai_provider as AIServiceType) || "gemini";
  } catch (error) {
    console.error("Error getting AI provider type:", error);
    return "gemini";
  }
}

/**
 * Fix test case name using AI via API
 */
export async function fixTestCaseNameClient(name: string): Promise<string> {
  try {
    const response = await fetch("/api/ai/fix-test-case-name", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      throw new Error("Failed to fix test case name");
    }

    const data = await response.json();
    return data.fixedName;
  } catch (error) {
    console.error("Error fixing test case name:", error);
    // Return original name on error
    return name;
  }
}

/**
 * Check if auto use AI suggestion is enabled (client-side)
 */
export async function isAutoUseAISuggestionEnabledClient(): Promise<boolean> {
  try {
    const settings = await getAISettingsClient();
    return settings.auto_use_ai_suggestion ?? true;
  } catch (error) {
    console.error("Error checking auto use AI suggestion setting:", error);
    return true; // Default to enabled
  }
} 