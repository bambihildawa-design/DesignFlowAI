import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Routes that stay public — the no-login requester flow (see the
 * architecture doc's §8.3) and its status pages, plus webhook endpoints,
 * which authenticate via signature verification instead of a session.
 */
const PUBLIC_PATH_PREFIXES = [
  "/request",
  "/r/",
  "/sign-in",
  "/sign-up",
  "/api/webhooks",
];

function isPublicRoute(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  // This client's only job here is to refresh the session cookie on every
  // request so a signed-in visit doesn't silently expire mid-session.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isPublicRoute(request.nextUrl.pathname) && !user) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next|.*\\.(?:html?|css|js|json|jpe?g|png|gif|svg|ico|webp|woff2?)).*)",
    "/(api|trpc)(.*)",
  ],
};
