// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: Next.js and its type definitions are not installed in this
// learning resource.

import { NextResponse } from "next/server";

// A Route Handler runs on the server on every request, so unlike a static
// page it reads process.env fresh each time rather than once at build time,
// for any variable that isn't NEXT_PUBLIC_-prefixed.
export async function GET() {
  const secret = process.env.API_SECRET_KEY;
  return NextResponse.json({
    publicName: process.env.NEXT_PUBLIC_SITE_NAME,
    hasSecret: Boolean(secret),
    secretLength: secret ? secret.length : 0,
  });
}
