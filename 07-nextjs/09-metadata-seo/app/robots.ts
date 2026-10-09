// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: Next.js and its type definitions are not installed in this
// learning resource.

import type { MetadataRoute } from "next";

// Same convention as sitemap.ts: this becomes a generated /robots.txt route.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/products/", // product detail pages excluded, for this demo
    },
    sitemap: "https://example-shop.test/sitemap.xml",
  };
}
