import { NextResponse, type NextRequest } from "next/server"

// Member-area path prefixes that require a session. Guest-viewable surfaces are
// deliberately left OUT so they fall through untouched: /[username] profiles,
// /events, and /membership pricing (only /membership/checkout is gated).
// Everything else in the member area is gated.
//
// This is a defense-in-depth UX backstop, NOT the authoritative gate: every
// page/route/server-action still calls requireUser()/requireAdmin(). Middleware
// only redirects fully-logged-out visitors to signin instead of letting them
// hit an error boundary — and catches any future private page whose author
// forgets to gate it.
//
// /admin is intentionally omitted: those pages already hard-gate via
// requireAdmin(), and their login lives at /auth/admin (not the member signin),
// so a presence-check here would redirect admins to the wrong page.
const PRIVATE_PREFIXES = [
  "/feed",
  "/community",
  "/groups",
  "/business",
  "/membership/checkout", // /membership itself is public pricing
  "/settings",
  "/connections",
  "/notifications",
  "/messages",
  "/compose",
  "/saved",
  "/network",
  "/profile", // /profile/edit — public profiles live at /[username]
  "/ama",
  "/games",
  "/upgrade",
  "/dashboard",
  "/onboarding",
]

// Auth.js v5 default session cookie names (http dev + https prod). We check
// PRESENCE only — validity is verified downstream by requireUser(). A stale or
// forged cookie passes here but is rejected there, so this can never expose
// data; and a logged-in user always carries the cookie, so it can never wrongly
// lock them out. No secret/salt/edge-Prisma involved.
const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"]

/** True if the path is in the member area and needs a session. Boundary-safe:
 *  "/network" matches "/network" and "/network/x" but not "/networkfoo". */
export function isProtectedPath(pathname: string): boolean {
  return PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (!isProtectedPath(pathname)) return NextResponse.next()

  const hasSession = SESSION_COOKIES.some((name) => req.cookies.has(name))
  if (hasSession) return NextResponse.next()

  const signin = new URL("/auth/signin", req.url)
  signin.searchParams.set("callbackUrl", pathname + req.nextUrl.search)
  return NextResponse.redirect(signin)
}

export const config = {
  // Skip API routes (they gate themselves; webhooks/cron must not be redirected),
  // Next internals, and any file with an extension (static assets).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)"],
}
