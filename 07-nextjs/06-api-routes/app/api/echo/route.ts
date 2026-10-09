// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: Next.js and its type definitions are not installed in this
// learning resource.

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (typeof body.message !== "string") {
    return NextResponse.json(
      { error: "message field is required" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    echoed: body.message,
    receivedAt: Date.now(),
  });
}
