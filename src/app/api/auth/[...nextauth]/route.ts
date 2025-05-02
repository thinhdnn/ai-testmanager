import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/options";

// Create the NextAuth handler with authOptions
const handler = NextAuth(authOptions);

// Export the GET and POST handler functions
export { handler as GET, handler as POST }; 