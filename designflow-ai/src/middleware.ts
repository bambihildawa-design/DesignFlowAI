import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Routes that stay public — the no-login requester flow (§8.3 of the
 * architecture doc) and its status pages, plus webhook endpoints, which
 * authenticate via signature verification instead of a Clerk session.
 */
const isPublicRoute = createRouteMatcher([
  "/",
  "/request(.*)",
  "/r/(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|.*\\.(?:html?|css|js|json|jpe?g|png|gif|svg|ico|webp|woff2?)).*)",
    "/(api|trpc)(.*)",
  ],
};
