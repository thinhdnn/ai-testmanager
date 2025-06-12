import { NextResponse } from "next/server";
import { getAISettings } from "@/lib/ai/ai-settings";

export async function GET() {
  try {
    const settings = await getAISettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching AI settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch AI settings" },
      { status: 500 }
    );
  }
} 