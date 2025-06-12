import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding AI settings...");

  const defaultSettings = [
    {
      key: "ai_provider",
      value: "gemini",
    },
    {
      key: "auto_use_ai_suggestion",
      value: "true",
    },
    {
      key: "gemini_model",
      value: "gemini-pro",
    },
    {
      key: "openai_model",
      value: "gpt-4",
    },
    {
      key: "grok_api_endpoint",
      value: "https://api.x.ai/v1",
    },
    {
      key: "grok_model",
      value: "grok-2-latest",
    },
    {
      key: "claude_api_endpoint",
      value: "https://api.anthropic.com/v1",
    },
    {
      key: "claude_model",
      value: "claude-3-5-sonnet-20241022",
    },
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: {
        key: setting.key,
        value: setting.value,
      },
    });
  }

  console.log("✅ AI settings seeded successfully");
}

main()
  .catch((e) => {
    console.error("Error seeding AI settings:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 