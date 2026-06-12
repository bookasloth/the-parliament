import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicRoutes = ["/auth/signin", "/auth/signup", "/"];

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublicRoute = publicRoutes.includes(path);
  const sessionToken =
    request.cookies.get("next-auth.session-token")?.value ??
    request.cookies.get("__Secure-next-auth.session-token")?.value;

  if (!isPublicRoute && !sessionToken) {
    return NextResponse.redirect(new URL("/auth/signin", request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};
