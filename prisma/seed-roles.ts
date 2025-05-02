import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

interface Role {
  name: string;
}

interface Permission {
  name: string;
  description: string;
}

async function main(): Promise<void> {
  console.log("Seeding default roles...");

  // Delete existing roles to avoid duplication
  try {
    await prisma.rolePermission.deleteMany({});
    await prisma.userRole.deleteMany({});
    await prisma.role.deleteMany({});
    console.log("Deleted existing roles, role permissions and user roles");
  } catch (error) {
    console.error("Error clearing existing data:", error);
  }

  // Create 4 default roles
  const roles: Role[] = [
    {
      name: "Administrator",
    },
    {
      name: "Project Manager",
    },
    {
      name: "Tester",
    },
    {
      name: "Viewer",
    },
  ];

  // Save roles to database
  console.log("Creating roles...");
  for (const roleData of roles) {
    await prisma.role.create({
      data: roleData,
    });
  }

  // Check if we have permissions
  const permissionsCount = await prisma.permission.count();
  if (permissionsCount === 0) {
    console.log("No permissions found. Creating default permissions...");
    await createDefaultPermissions();
  }

  // Get all permissions from the database
  const permissions = await prisma.permission.findMany();
  if (permissions.length === 0) {
    console.log("No permissions available to assign to roles");
    return;
  }

  // Get created roles
  const administrator = await prisma.role.findUnique({
    where: { name: "Administrator" },
  });
  const projectManager = await prisma.role.findUnique({
    where: { name: "Project Manager" },
  });
  const tester = await prisma.role.findUnique({ where: { name: "Tester" } });
  const viewer = await prisma.role.findUnique({ where: { name: "Viewer" } });

  if (!administrator || !projectManager || !tester || !viewer) {
    console.error("One or more roles not found!");
    return;
  }

  // Assign permissions to Administrator (all permissions)
  console.log("Assigning permissions to Administrator role...");
  for (const permission of permissions) {
    await prisma.rolePermission.create({
      data: {
        roleId: administrator.id,
        permissionId: permission.id,
      },
    });
  }

  // Assign permissions to Project Manager
  console.log("Assigning permissions to Project Manager role...");
  for (const permission of permissions) {
    if (
      permission.name.startsWith("project.") ||
      permission.name === "testcase.read" ||
      permission.name === "testcase.run"
    ) {
      await prisma.rolePermission.create({
        data: {
          roleId: projectManager.id,
          permissionId: permission.id,
        },
      });
    }
  }

  // Assign permissions to Tester
  console.log("Assigning permissions to Tester role...");
  for (const permission of permissions) {
    if (
      permission.name.startsWith("testcase.") ||
      permission.name === "project.read" ||
      permission.name === "project.run"
    ) {
      await prisma.rolePermission.create({
        data: {
          roleId: tester.id,
          permissionId: permission.id,
        },
      });
    }
  }

  // Assign permissions to Viewer
  console.log("Assigning permissions to Viewer role...");
  for (const permission of permissions) {
    if (
      permission.name === "project.read" ||
      permission.name === "testcase.read"
    ) {
      await prisma.rolePermission.create({
        data: {
          roleId: viewer.id,
          permissionId: permission.id,
        },
      });
    }
  }

  console.log("Role seeding completed!");
}

// Hàm tạo permissions mặc định nếu chưa có
async function createDefaultPermissions(): Promise<void> {
  const defaultPermissions: Permission[] = [
    { name: "project.view", description: "View projects" },
    { name: "project.update", description: "Update project details" },
    { name: "project.delete", description: "Delete projects" },
    { name: "project.run", description: "Run project tests" },
    { name: "testcase.view", description: "View test cases" },
    { name: "testcase.update", description: "Update test cases" },
    { name: "testcase.delete", description: "Delete test cases" },
    { name: "testcase.run", description: "Run test cases" },
    { name: "user.manage", description: "Manage users (create, update, delete)" },
    { name: "role.manage", description: "Manage roles and permissions" },
    { name: "system.settings", description: "Change system settings" },
  ];

  for (const permissionData of defaultPermissions) {
    await prisma.permission.create({
      data: permissionData,
    });
  }

  console.log(`Created ${defaultPermissions.length} default permissions`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// For ESM compatibility
export {}; 