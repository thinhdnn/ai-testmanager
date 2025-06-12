import { NextRequest, NextResponse } from "next/server";
import { getAISettings } from "@/lib/ai/ai-settings";
import { updateSettings } from "@/lib/db/repositories/settings-repository";
import { checkPermission } from "@/lib/rbac/check-permission";
import { getCurrentUserEmail } from "@/lib/auth/session";
import { prisma } from '@/lib/db/prisma';
import { resetAIService } from "@/lib/ai/ai-service";
import { maskApiKey, shouldUpdateApiKey } from "@/lib/utils/mask-utils";

// GET /api/settings/ai - Get all AI provider settings
export async function GET() {
  try {
    const settings = await getAISettings();
    
    // Convert to format expected by the settings page
    const response = {
      activeProvider: settings.ai_provider || "gemini",
      autoUseAiSuggestion: settings.auto_use_ai_suggestion ?? true,
      openai: {
        url: "https://api.openai.com/v1", // OpenAI has a fixed URL
        apiKey: maskApiKey(settings.openai_api_key || ""),
        model: settings.openai_model || "gpt-4o"
      },
      gemini: {
        url: "https://generativelanguage.googleapis.com/v1", // Gemini has a fixed URL
        apiKey: maskApiKey(settings.gemini_api_key || ""),
        model: settings.gemini_model || "gemini-1.5-flash"
      },
      claude: {
        url: settings.claude_api_endpoint || "https://api.anthropic.com/v1",
        apiKey: maskApiKey(settings.claude_api_key || ""),
        model: settings.claude_model || "claude-3-5-sonnet-20241022"
      },
      grok: {
        url: settings.grok_api_endpoint || "https://api.x.ai/v1",
        apiKey: maskApiKey(settings.grok_api_key || ""),
        model: settings.grok_model || "grok-2-latest"
      }
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching AI settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch AI settings" },
      { status: 500 }
    );
  }
}

// PUT /api/settings/ai - Update AI settings
export async function PUT(request: NextRequest) {
  try {
    // Check system settings permission
    const hasPermission = await checkPermission("system", "settings");
    const userEmail = await getCurrentUserEmail();
    
    if (!hasPermission) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: You don't have permission to update settings",
        },
        { status: 403 }
      );
    }
    
    const data = await request.json();
    
    // Extract and update the AI settings
    const settingsToUpdate: Record<string, string> = {};
    
    const allowedKeys = [
      "ai_provider",
      "auto_use_ai_suggestion",
      "openai_api_key",
      "openai_model",
      "gemini_api_key",
      "gemini_model",
      "grok_api_key",
      "grok_api_endpoint",
      "grok_model",
      "claude_api_key",
      "claude_api_endpoint",
      "claude_model",
    ];
    
    allowedKeys.forEach((key) => {
      if (data[key] !== undefined) {
        settingsToUpdate[key] = data[key];
      }
    });
    
    if (Object.keys(settingsToUpdate).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No valid settings provided",
        },
        { status: 400 }
      );
    }
    
    const updatedSettings = await updateSettings(settingsToUpdate, userEmail || undefined);
    
    // Reset AI service to pick up new settings
    resetAIService();
    
    // Mask API keys in response
    const maskedResponse = updatedSettings.map((setting) => {
      if (
        setting.key === "openai_api_key" ||
        setting.key === "gemini_api_key" ||
        setting.key === "grok_api_key" ||
        setting.key === "claude_api_key"
      ) {
        return { ...setting, value: maskApiKey(setting.value) };
      }
      return setting;
    });
    
    return NextResponse.json(
      {
        success: true,
        data: maskedResponse,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating AI settings:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update AI settings",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check system settings permission
    const hasPermission = await checkPermission("system", "settings");
    const userEmail = await getCurrentUserEmail();
    
    if (!hasPermission) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: You don't have permission to update settings",
        },
        { status: 403 }
      );
    }

    const data = await req.json();
    
    // Extract AI settings and save them individually (same format as PUT)
    const settingsToUpdate: Record<string, string> = {};
    
    // Handle the new format from the settings page
    if (data.activeProvider) {
      settingsToUpdate["ai_provider"] = data.activeProvider;
    }
    
    if (data.autoUseAiSuggestion !== undefined) {
      settingsToUpdate["auto_use_ai_suggestion"] = String(data.autoUseAiSuggestion);
    }
    
    // Handle each provider's settings
    if (data.openai) {
      if (data.openai.apiKey && shouldUpdateApiKey(data.openai.apiKey)) {
        settingsToUpdate["openai_api_key"] = data.openai.apiKey;
      }
      if (data.openai.model) settingsToUpdate["openai_model"] = data.openai.model;
    }
    
    if (data.gemini) {
      if (data.gemini.apiKey && shouldUpdateApiKey(data.gemini.apiKey)) {
        settingsToUpdate["gemini_api_key"] = data.gemini.apiKey;
      }
      if (data.gemini.model) settingsToUpdate["gemini_model"] = data.gemini.model;
    }
    
    if (data.claude) {
      if (data.claude.apiKey && shouldUpdateApiKey(data.claude.apiKey)) {
        settingsToUpdate["claude_api_key"] = data.claude.apiKey;
      }
      if (data.claude.model) settingsToUpdate["claude_model"] = data.claude.model;
      if (data.claude.url) settingsToUpdate["claude_api_endpoint"] = data.claude.url;
    }
    
    if (data.grok) {
      if (data.grok.apiKey && shouldUpdateApiKey(data.grok.apiKey)) {
        settingsToUpdate["grok_api_key"] = data.grok.apiKey;
      }
      if (data.grok.model) settingsToUpdate["grok_model"] = data.grok.model;
      if (data.grok.url) settingsToUpdate["grok_api_endpoint"] = data.grok.url;
    }
    
    // Save each setting individually
    const updatedSettings = await updateSettings(settingsToUpdate, userEmail || undefined);
    
    // Reset AI service to pick up new settings
    resetAIService();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating AI settings:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update AI settings",
      },
      { status: 500 }
    );
  }
} 