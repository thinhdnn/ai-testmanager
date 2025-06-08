import { NextRequest, NextResponse } from "next/server";
import { getAISettings } from "@/lib/ai/ai-settings";
import { updateSettings } from "@/lib/db/repositories/settings-repository";
import { checkPermission } from "@/lib/rbac/check-permission";
import { getCurrentUserEmail } from "@/lib/auth/session";
import { prisma } from '@/lib/db/prisma';

// GET /api/settings/ai - Get all AI provider settings
export async function GET() {
  const setting = await prisma.setting.findUnique({ where: { key: 'ai_settings' } });
  return NextResponse.json(setting ? JSON.parse(setting.value) : {});
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
    
    // Mask API keys in response
    const maskedResponse = updatedSettings.map((setting) => {
      if (
        setting.key === "openai_api_key" ||
        setting.key === "gemini_api_key" ||
        setting.key === "grok_api_key" ||
        setting.key === "claude_api_key"
      ) {
        return { ...setting, value: "********" };
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
  const data = await req.json();
  const value = JSON.stringify(data);
  await prisma.setting.upsert({
    where: { key: 'ai_settings' },
    update: { value },
    create: { key: 'ai_settings', value },
  });
  return NextResponse.json({ success: true });
} 