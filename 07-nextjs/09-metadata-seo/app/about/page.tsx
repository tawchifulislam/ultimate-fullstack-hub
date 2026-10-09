// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: React, Next.js, and their type definitions are not installed in this
// learning resource.

import type { Metadata } from "next";

// A page-supplied title DOES go through the layout's template, so the
// rendered <title> becomes "About | Example Shop".
export const metadata: Metadata = {
  title: "About",
  description: "Why Example Shop exists.",
};

export default function AboutPage() {
  return (
    <main>
      <h1>About</h1>
    </main>
  );
}
