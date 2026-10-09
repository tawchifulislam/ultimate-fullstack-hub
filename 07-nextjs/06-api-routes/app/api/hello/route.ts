// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: Next.js and its type definitions are not installed in this
// learning resource.

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name") ?? "World";
  return NextResponse.json({
    message: `Hello, ${name}!`,
    renderedAt: Date.now(),
  });
}
