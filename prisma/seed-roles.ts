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

  // Create default roles
  const roles: Role[] = [
    { name: "Administrator" },
    { name: "Project Manager" },
    { name: "Test Engineer" },
    { name: "Viewer" },
    { name: "System Administrator" }
  ];

  // Save roles to database
  console.log("Creating roles...");
  for (const roleData of roles) {
    await prisma.role.create({
      data: roleData,
    });
  }

  // Clear existing permissions
  try {
    await prisma.permissionAssignment.deleteMany({});
    await prisma.permission.deleteMany({});
    console.log("Deleted existing permissions and assignments");
  } catch (error) {
    console.error("Error clearing existing permissions:", error);
  }

  // Create default permissions
  console.log("Creating permissions...");
  await createDefaultPermissions();

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
  const testEngineer = await prisma.role.findUnique({ 
    where: { name: "Test Engineer" } 
  });
  const viewer = await prisma.role.findUnique({ 
    where: { name: "Viewer" } 
  });
  const systemAdmin = await prisma.role.findUnique({
    where: { name: "System Administrator" },
  });

  if (!administrator || !projectManager || !testEngineer || !viewer || !systemAdmin) {
    console.error("One or more roles not found!");
    return;
  }

  // Create lookup map for permissions
  const permissionMap = new Map<string, string>();
  permissions.forEach(p => permissionMap.set(p.name, p.id));

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
  const projectManagerPermissions = [
    "project.view", "project.update", "project.run", "project.delete"
  ];
  await assignPermissionsToRole(projectManager.id, projectManagerPermissions, permissionMap);

  // Assign permissions to Test Engineer
  console.log("Assigning permissions to Test Engineer role...");
  const testEngineerPermissions = [
    "project.view", "project.update", "project.run"
  ];
  await assignPermissionsToRole(testEngineer.id, testEngineerPermissions, permissionMap);

  // Assign permissions to Viewer
  console.log("Assigning permissions to Viewer role...");
  const viewerPermissions = [
    "project.view"
  ];
  await assignPermissionsToRole(viewer.id, viewerPermissions, permissionMap);

  // Assign permissions to System Administrator
  console.log("Assigning permissions to System Administrator role...");
  const systemAdminPermissions = [
    "user.manage", "system.settings", "role.manage"
  ];
  await assignPermissionsToRole(systemAdmin.id, systemAdminPermissions, permissionMap);

  console.log("Role seeding completed!");
}

// Helper function to assign permissions to a role
async function assignPermissionsToRole(
  roleId: string, 
  permissionNames: string[], 
  permissionMap: Map<string, string>
): Promise<void> {
  for (const permName of permissionNames) {
    const permId = permissionMap.get(permName);
    if (permId) {
      await prisma.rolePermission.create({
        data: {
          roleId: roleId,
          permissionId: permId,
        },
      });
    } else {
      console.warn(`Permission '${permName}' not found`);
    }
  }
}

// Create default permissions
async function createDefaultPermissions(): Promise<void> {
  const defaultPermissions: Permission[] = [
    // Project permissions
    { name: "project.view", description: "View projects, fixtures, test cases and results" },
    { name: "project.update", description: "Create and update projects, fixtures and test cases" },
    { name: "project.run", description: "Execute tests and view results" },
    { name: "project.delete", description: "Delete projects and all their data" },
    
    // System management permissions
    { name: "user.manage", description: "Manage users (create, update, delete, assign roles)" },
    { name: "system.settings", description: "Configure system settings and integrations" },
    { name: "role.manage", description: "Manage roles and their permissions" }
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