import { NextResponse } from "next/server"
// Auth commented out for UI testing — all routes are public
// import { getToken } from "next-auth/jwt"

// const ONBOARDING_ROUTES = ["/onboarding/profile", "/onboarding/jnv", "/onboarding/interests", "/onboarding/membership", "/onboarding/complete"]
// const PUBLIC_ROUTES = ["/auth/signin", "/auth/signup", "/"]
// const AUTH_ROUTES = ["/auth/signin", "/auth/signup"]

export async function middleware() {
  // Allow all requests — auth disabled for UI testing
  return NextResponse.next()

  // const { pathname } = req.nextUrl
  // if (pathname.startsWith("/_next") || pathname.startsWith("/api")) {
  //   return
  // }
  // const token = await getToken({ req, secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET })
  // const isLoggedIn = !!token
  // if (PUBLIC_ROUTES.includes(pathname)) {
  //   return
  // }
  // if (!isLoggedIn) {
  //   const signInUrl = new URL("/auth/signin", req.url)
  //   signInUrl.searchParams.set("callbackUrl", pathname)
  //   return NextResponse.redirect(signInUrl)
  // }
  // const onboardingCompleted = token?.onboardingCompleted as boolean | undefined
  // const isOnboardingRoute = ONBOARDING_ROUTES.includes(pathname)
  // if (onboardingCompleted) {
  //   if (isOnboardingRoute) {
  //     return NextResponse.redirect(new URL("/feed", req.url))
  //   }
  //   return
  // }
  // if (isOnboardingRoute) {
  //   return
  // }
  // const step = (token?.onboardingStep as string) || "profile"
  // return NextResponse.redirect(new URL(`/onboarding/${step}`, req.url))
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
