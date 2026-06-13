import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

const ONBOARDING_STEPS = ["profile", "jnv", "interests", "membership", "complete"] as const
const ONBOARDING_ROUTES = ONBOARDING_STEPS.map((s) => `/onboarding/${s}`)
const PUBLIC_ROUTES = new Set(["/", "/auth/signin", "/auth/signup"])

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/fonts")
  ) {
    return NextResponse.next()
  }

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  })
  const isLoggedIn = !!token

  if (PUBLIC_ROUTES.has(pathname)) {
    return NextResponse.next()
  }

  if (!isLoggedIn) {
    const signInUrl = new URL("/auth/signin", req.url)
    signInUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(signInUrl)
  }

  const onboardingCompleted = token?.onboardingCompleted as boolean | undefined
  const step = (token?.onboardingStep as string) || "profile"
  const isOnboardingRoute = ONBOARDING_ROUTES.includes(pathname)

  if (onboardingCompleted) {
    if (isOnboardingRoute) {
      return NextResponse.redirect(new URL("/feed", req.url))
    }
    return NextResponse.next()
  }

  if (isOnboardingRoute) {
    return NextResponse.next()
  }

  return NextResponse.redirect(new URL(`/onboarding/${step}`, req.url))
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
