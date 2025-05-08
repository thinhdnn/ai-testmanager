import { PrismaClient } from '@prisma/client';

// Use a single instance of Prisma Client across the app
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma; 