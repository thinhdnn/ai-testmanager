import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedTags(): Promise<void> {
  console.log("Seeding default global tags...");

  const defaultTags = [
    // Priority tags
    { value: "high", label: "High Priority" },
    { value: "medium", label: "Medium Priority" },
    { value: "low", label: "Low Priority" },
    
    // Test type tags
    { value: "smoke", label: "Smoke" },
    { value: "regression", label: "Regression" },
    { value: "api", label: "API" },
    { value: "ui", label: "UI" },
    { value: "performance", label: "Performance" },
    { value: "security", label: "Security" },
    { value: "accessibility", label: "Accessibility" }
  ];


  for (const tag of defaultTags) {
    try {
      // Check if tag already exists as a global tag
      const existingTag = await prisma.tag.findFirst({
        where: {
          value: tag.value,
          projectId: null as any
        }
      });

      if (!existingTag) {
        await prisma.tag.create({
          data: {
            value: tag.value,
            label: tag.label,
            projectId: null as any 
          }
        });
        console.log(`Created global tag: ${tag.label}`);
      } else {
        console.log(`Global tag already exists: ${tag.label}`);
      }
    } catch (error) {
      console.error(`Error creating tag ${tag.label}:`, error);
    }
  }

  console.log("Global tags seeding completed!");
}

seedTags()
  .catch((e) => {
    console.error("Tags seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 