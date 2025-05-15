import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
          include: {
            roles: {
              include: {
                role: {
                  include: {
                    permissions: {
                      include: {
                        permission: true
                      }
                    }
                  }
                }
              }
            },
            permissions: {
              include: {
                permission: true
              }
            }
          }
        });

        if (!user || !user.isActive) {
          return null;
        }

        const isPasswordValid = await compare(credentials.password, user.password);

        if (!isPasswordValid) {
          return null;
        }

        // Extract roles and permissions
        const roleNames: string[] = user.roles.map(r => r.role.name);
        
        // Collect all permissions from roles and direct assignments
        const allPermissions: string[] = [
          ...user.roles.flatMap(r => r.role.permissions.map(p => p.permission.name)),
          ...user.permissions.map(p => p.permission.name)
        ];
        const permissionNames: string[] = Array.from(new Set(allPermissions));

        return {
          id: user.id,
          name: user.username,
          email: user.email,
          roles: roleNames,
          permissions: permissionNames
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.roles = user.roles;
        token.permissions = user.permissions;
      }
      return token;
    },
    async session({ session, token }) {
      // Verify that the user still exists in the database
      if (token.id) {
        try {
          const user = await prisma.user.findUnique({
            where: { id: token.id as string },
          });
          
          // If user no longer exists or is inactive, set invalidated flag
          if (!user || !user.isActive) {
            token.invalidated = true;
            return { ...session, error: "Session invalidated" };
          }
        } catch (error) {
          console.error("Error verifying session user:", error);
          // On DB error, set invalidated flag
          token.invalidated = true;
          return { ...session, error: "Session verification error" };
        }
      }
      
      // Check for invalidation flag
      if (token.invalidated) {
        return { ...session, error: "Session invalidated" };
      }
      
      // User exists, populate session
      if (session.user && token) {
        session.user.id = token.id;
        session.user.roles = token.roles;
        session.user.permissions = token.permissions;
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: "jwt",
    maxAge: 4 * 60 * 60, // 4 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
}; 