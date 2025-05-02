import { PrismaClient } from "@prisma/client";
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main(): Promise<void> {
  console.log("Starting database seeding process...");

  // Step 1: Seed roles and permissions first
  console.log("\n=============================================");
  console.log("STEP 1: Seeding roles and permissions");
  console.log("=============================================\n");
  
  const seedRolesResult = spawnSync("npx", ["tsx", path.join(__dirname, "seed-roles.ts")], {
    stdio: "inherit",
  });

  if (seedRolesResult.status !== 0) {
    throw new Error("Failed to seed roles and permissions");
  }

  // Step 2: Seed users with appropriate roles
  console.log("\n=============================================");
  console.log("STEP 2: Seeding users");
  console.log("=============================================\n");
  
  const seedUsersResult = spawnSync("npx", ["tsx", path.join(__dirname, "seed-users.ts")], {
    stdio: "inherit",
  });

  if (seedUsersResult.status !== 0) {
    throw new Error("Failed to seed users");
  }

  // Step 3: Seed default tags
  console.log("\n=============================================");
  console.log("STEP 3: Seeding default tags");
  console.log("=============================================\n");
  
  const seedTagsResult = spawnSync("npx", ["tsx", path.join(__dirname, "seed-tags.ts")], {
    stdio: "inherit",
  });

  if (seedTagsResult.status !== 0) {
    throw new Error("Failed to seed default tags");
  }

  console.log("\n=============================================");
  console.log("DATABASE SEEDING COMPLETED SUCCESSFULLY!");
  console.log("=============================================\n");
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
