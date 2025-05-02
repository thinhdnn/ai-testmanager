import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log("Seeding users...");

  // Xóa người dùng hiện có (tùy chọn)
  try {
    await prisma.userRole.deleteMany();
    await prisma.user.deleteMany();
    console.log("Deleted existing users and user roles");
  } catch (error) {
    console.log("Error clearing existing users:", error);
  }

  // Tìm role Administrator
  const adminRole = await prisma.role.findUnique({
    where: { name: "Administrator" },
  });

  if (!adminRole) {
    console.error("Administrator role not found! Please run seed-roles.ts first.");
    return;
  }

  // Tìm role Tester
  const testerRole = await prisma.role.findUnique({
    where: { name: "Tester" },
  });

  if (!testerRole) {
    console.error("Tester role not found! Please run seed-roles.ts first.");
    return;
  }

  // Admin user
  const adminPassword = await bcrypt.hash("admin123", 10);
  const adminUser = await prisma.user.create({
    data: {
      username: "admin",
      password: adminPassword,
      email: "admin@gmail.com",
      isActive: true,
    },
  });
  console.log("Created admin user");

  // Gán role Administrator cho admin user
  await prisma.userRole.create({
    data: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });
  console.log("Assigned Administrator role to admin user");

  // Test user
  const userPassword = await bcrypt.hash("user123", 10);
  const regularUser = await prisma.user.create({
    data: {
      username: "user",
      password: userPassword,
      email: "user@gmail.com",
      isActive: true,
    },
  });
  console.log("Created regular user");

  // Gán role Tester cho regular user
  await prisma.userRole.create({
    data: {
      userId: regularUser.id,
      roleId: testerRole.id,
    },
  });
  console.log("Assigned Tester role to regular user");

  console.log("Seeding finished");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 