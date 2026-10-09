// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: Next.js and its type definitions are not installed in this
// learning resource.

import type { MetadataRoute } from "next";
import { getAllProductIds } from "../lib/products";

// A file named exactly sitemap.ts (or .js), exporting a default function,
// becomes a generated /sitemap.xml route automatically, no route file needed.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://example-shop.test";

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date("2026-01-01") },
    { url: `${base}/about`, lastModified: new Date("2026-01-01") },
  ];

  const productRoutes: MetadataRoute.Sitemap = getAllProductIds().map((id) => ({
    url: `${base}/products/${id}`,
    lastModified: new Date("2026-01-01"),
  }));

  return [...staticRoutes, ...productRoutes];
}
