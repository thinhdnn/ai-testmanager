import { NextRequest, NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai/ai-provider";

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const aiProvider = await getAIProvider();
    if (!aiProvider) {
      return NextResponse.json(
        { error: "AI provider not configured" },
        { status: 500 }
      );
    }

    const fixedName = await aiProvider.fixTestCaseName(name.trim());

    return NextResponse.json({ fixedName });
  } catch (error) {
    console.error("Error fixing test case name:", error);
    return NextResponse.json(
      { error: "Failed to fix test case name" },
      { status: 500 }
    );
  }
} 