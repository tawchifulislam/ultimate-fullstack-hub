// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: Next.js and its type definitions are not installed in this
// learning resource.

import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rewrite: /old-promo silently serves the content of /new-promo.
  // The browser's address bar still shows /old-promo.
  if (pathname === "/old-promo") {
    const response = NextResponse.rewrite(new URL("/new-promo", request.url));
    response.headers.set("x-demo-header", "middleware-ran");
    return response;
  }

  // Redirect: an unauthenticated visitor to /dashboard is sent to /login,
  // with the original path preserved as a ?from= query param.
  if (pathname.startsWith("/dashboard")) {
    const hasSession = request.cookies.has("session");
    if (!hasSession) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      const response = NextResponse.redirect(loginUrl);
      response.headers.set("x-demo-header", "middleware-ran");
      return response;
    }
  }

  // Everything else: continue normally, but prove middleware ran and
  // echo back a request header to show middleware can read incoming headers.
  const response = NextResponse.next();
  response.headers.set("x-demo-header", "middleware-ran");
  response.headers.set(
    "x-echo-ua",
    request.headers.get("user-agent") ?? "unknown"
  );
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
