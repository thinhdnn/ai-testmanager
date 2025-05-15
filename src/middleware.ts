import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

// Export the middleware that applies authentication checks
export default withAuth(
  // Augment the request handler
  function middleware(req) {
    const path = req.nextUrl.pathname;
    
    // If trying to access protected paths and not authenticated, redirect to login
    if (!req.nextauth.token) {
      // Prevent recursive redirects to signin page
      if (path === '/auth/signin') {
        return NextResponse.next();
      }
      
      // Save the original URL they were trying to access for redirect after login
      const callbackUrl = encodeURIComponent(req.url);
      return NextResponse.redirect(new URL(`/auth/signin?callbackUrl=${callbackUrl}`, req.url));
    }
    
    // If session has an error (invalidated by session callback), redirect to login
    if (req.nextauth.token?.invalidated || (req.nextauth.token as any)?.error) {
      // Clear the session cookie and redirect to login
      const response = NextResponse.redirect(new URL('/auth/signin', req.url));
      response.cookies.delete('next-auth.session-token');
      response.cookies.delete('__Secure-next-auth.session-token');
      return response;
    }
    
    // If session is valid but expired (e.g., token is about to expire)
    if (req.nextauth.token && typeof req.nextauth.token.exp === 'number') {
      const expiresInSeconds = req.nextauth.token.exp - Math.floor(Date.now() / 1000);
      
      // If token expires in less than 10 minutes (600 seconds), add a response header
      // This can be used by client-side code to show a refresh warning
      if (expiresInSeconds < 600) {
        const response = NextResponse.next();
        response.headers.set('X-Session-Expiring-Soon', 'true');
        response.headers.set('X-Session-Expires-In', String(expiresInSeconds));
        return response;
      }
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
          "/auth/signup",
          "/auth/error",
          "/auth/verify",
          "/auth/reset-password",
          "/auth/forgot-password",
          "/auth/new-password",
          "/_next",
          "/api/auth", 
          "/favicon.ico",
          "/logo.svg",
          "/images",
          "/fonts",
          "/assets",
          "/locales",
        ];
        
        // API routes that don't require authentication
        const publicApiRoutes = [
          "/api/auth",
          "/api/health",
          "/api/public",
          "/api/webhook"
        ];
        
        // Check if the path is public
        if (publicRoutes.some(route => path.startsWith(route))) {
          return true;
        }
        
        // Check if the path is a public API route
        if (publicApiRoutes.some(route => path.startsWith(route))) {
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
     * 3. /fonts, /images, /assets (static resources)
     * 4. /favicon.ico, /sitemap.xml, /robots.txt (SEO resources)
     */
    "/((?!api/auth|_next|fonts|images|assets|locales|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
}; 