import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

// Export the middleware that applies authentication checks
export default withAuth(
  // Augment the request handler
  function middleware(req) {
    const path = req.nextUrl.pathname;
    
    // If trying to access root path ('/') and not authenticated, redirect to login
    if (path === '/' && !req.nextauth.token) {
      return NextResponse.redirect(new URL('/auth/signin', req.url));
    }
    
    return NextResponse.next();
  },
  {
    callbacks: {
      // Only run this middleware for authenticated routes
      authorized({ req, token }) {
        const path = req.nextUrl.pathname;
        
        // Public routes that don't require authentication
        const publicRoutes = [
          "/auth/signin",
          "/auth/error",
          "/_next",
          "/api/auth", 
          "/favicon.ico",
        ];
        
        // Check if the path is public
        if (publicRoutes.some(route => path.startsWith(route))) {
          return true;
        }
        
        // For all other routes, require authentication
        return !!token;
      },
    },
  }
);

// Define which routes this middleware should run on
export const config = {
  matcher: [
    /*
     * Match all routes except:
     * 1. /api/auth (NextAuth.js API routes)
     * 2. /_next (Next.js internals)
     * 3. /fonts, /images (static resources)
     * 4. /favicon.ico, /sitemap.xml (SEO resources)
     */
    "/((?!api/auth|_next|fonts|images|favicon.ico|sitemap.xml).*)",
  ],
}; 