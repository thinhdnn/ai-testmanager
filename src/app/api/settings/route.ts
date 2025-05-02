import { NextRequest, NextResponse } from "next/server";
import {
  getSettings,
  getSystemSettings,
  updateSystemSettings,
} from "@/lib/db/repositories/settings-repository";
import { checkPermission } from "@/lib/rbac/check-permission";
import { getCurrentUserEmail } from "@/lib/auth/session";

// GET /api/settings - Get all settings or specific settings
export async function GET(request: NextRequest) {
  try {
    // Optionally filter by keys from query params
    const searchParams = request.nextUrl.searchParams;
    const keys = searchParams.get("keys")?.split(",");

    if (keys && keys.length > 0) {
      const settings = await getSettings(keys);
      return NextResponse.json(
        { 
          success: true, 
          data: settings 
        }, 
        { status: 200 }
      );
    }

    // Get system settings object
    if (searchParams.get("type") === "system") {
      const systemSettings = await getSystemSettings();
      return NextResponse.json(
        { 
          success: true, 
          data: systemSettings 
        }, 
        { status: 200 }
      );
    }

    // Get all settings
    const allSettings = await getSettings();
    return NextResponse.json(
      { 
        success: true, 
        data: allSettings 
      }, 
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch settings" 
      }, 
      { status: 500 }
    );
  }
}

// PUT /api/settings - Update settings
export async function PUT(request: NextRequest) {
  try {
    // Check for system settings permission
    const hasPermission = await checkPermission("system", "settings");
    const userEmail = await getCurrentUserEmail();
    
    if (!hasPermission) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: You don't have permission to modify system settings",
        },
        { status: 403 }
      );
    }

    const data = await request.json();

    // Update system settings
    if (data.type === "system") {
      const { systemName, theme, enableBackup, defaultProjectId } = data;
      const updatedSettings = await updateSystemSettings(
        {
          systemName,
          theme,
          enableBackup,
          defaultProjectId,
        },
        userEmail || undefined
      );

      return NextResponse.json(
        {
          success: true,
          data: updatedSettings,
        },
        { status: 200 }
      );
    }

    // Handle other setting types if needed

    return NextResponse.json(
      {
        success: false,
        error: "Invalid settings type",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update settings",
      },
      { status: 500 }
    );
  }
} 