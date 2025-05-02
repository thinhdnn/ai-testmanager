import { prisma } from "@/lib/db/prisma";

export type Setting = {
  id: string;
  key: string;
  value: string;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
};

export interface SystemSettingsData {
  systemName?: string;
  theme?: string;
  enableBackup?: boolean;
  defaultProjectId?: string;
}

export type SettingKey = keyof SystemSettingsData | keyof any;

export const defaultSystemSettings: SystemSettingsData = {
  systemName: "AI Test Manager",
  theme: "system", // system, dark, light
  enableBackup: false,
  defaultProjectId: "",
};

export async function getSetting(key: string): Promise<Setting | null> {
  return prisma.setting.findUnique({
    where: { key },
  });
}

export async function getSettings(keys?: string[]): Promise<Setting[]> {
  if (keys && keys.length > 0) {
    return prisma.setting.findMany({
      where: {
        key: {
          in: keys,
        },
      },
    });
  }
  
  return prisma.setting.findMany();
}

export async function getSystemSettings(): Promise<SystemSettingsData> {
  const settingsFromDB = await getSettings([
    "systemName",
    "theme",
    "enableBackup",
    "defaultProjectId",
  ]);

  // Create settings object with defaults
  const settings: SystemSettingsData = { ...defaultSystemSettings };

  // Apply any settings from the database
  settingsFromDB.forEach((setting) => {
    const key = setting.key as keyof SystemSettingsData;
    if (key === "enableBackup") {
      settings[key] = setting.value === "true";
    } else {
      settings[key] = setting.value;
    }
  });

  return settings;
}

export async function upsertSetting(
  key: string,
  value: string,
  userId?: string
): Promise<Setting> {
  return prisma.setting.upsert({
    where: { key },
    update: {
      value,
      updatedBy: userId,
    },
    create: {
      key,
      value,
      createdBy: userId,
    },
  });
}

export async function updateSettings(
  settings: Record<string, string>,
  userId?: string
): Promise<Setting[]> {
  const operations: Promise<Setting>[] = [];

  for (const [key, value] of Object.entries(settings)) {
    operations.push(upsertSetting(key, value, userId));
  }

  return Promise.all(operations);
}

export async function updateSystemSettings(
  data: Partial<SystemSettingsData>,
  userId?: string
): Promise<Setting[]> {
  const settings: Record<string, string> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      settings[key] = typeof value === "boolean" ? String(value) : value;
    }
  }

  return updateSettings(settings, userId);
}

export async function deleteSetting(key: string): Promise<Setting | null> {
  return prisma.setting.delete({
    where: { key },
  });
} 