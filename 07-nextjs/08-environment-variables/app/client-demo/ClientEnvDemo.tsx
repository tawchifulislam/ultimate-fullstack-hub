// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: React, Next.js, and their type definitions are not installed in this
// learning resource.

"use client";

// This runs in the browser. Only NEXT_PUBLIC_-prefixed variables survive
// the build into client code; anything else reads back as undefined there,
// because it was never inlined into this bundle in the first place.
//
// Careful: this component is ALSO rendered once on the server (for the
// initial HTML), and during that pass process.env.API_SECRET_KEY IS the
// real value, which is why it shows up below, see the topic notes for why
// that is a real leak and how to avoid it.
export default function ClientEnvDemo() {
  return (
    <div>
      <p id="client-public">
        NEXT_PUBLIC_SITE_NAME on client: {String(process.env.NEXT_PUBLIC_SITE_NAME)}
      </p>
      <p id="client-secret">
        API_SECRET_KEY on client: {String(process.env.API_SECRET_KEY)}
      </p>
    </div>
  );
}
