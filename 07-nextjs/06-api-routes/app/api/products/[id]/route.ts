// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: Next.js and its type definitions are not installed in this
// learning resource.

import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.json({ id, price: 19.99 });
}
