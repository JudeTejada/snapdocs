import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { apiService } from "@/services/api";

// Routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/connect-github",
  "/auth/github/callback",
]);

// Routes that should skip GitHub connection check
const skipGitHubCheckRoutes = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/connect-github",
  "/auth/github/callback",
  "/api(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Allow public routes without authentication
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Protect all other routes - require authentication
  const { getToken } = await auth.protect();

  // Skip GitHub check for certain routes
  if (skipGitHubCheckRoutes(req)) {
    return NextResponse.next();
  }

  try {
    const token = await getToken();

    if (token) {
      const response = await apiService.getGitHubStatus(token);

      // If GitHub is not connected, redirect to connect-github page
      if (response.success && !response.data?.connected) {
        const connectUrl = new URL('/connect-github', req.url);
        return NextResponse.redirect(connectUrl);
      }
    }
  } catch (error) {
    // If there's an error checking GitHub status, allow the request to continue
    // The dashboard will handle showing appropriate UI
    console.error('[Middleware] Error checking GitHub status:', error);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};