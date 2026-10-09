// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: React, Next.js, and their type definitions are not installed in this
// learning resource.

import type { Metadata } from "next";

// metadataBase resolves every relative URL used in this metadata tree
// (like the openGraph image below) into an absolute URL.
export const metadata: Metadata = {
  metadataBase: new URL("https://example-shop.test"),
  title: {
    default: "Example Shop",
    template: "%s | Example Shop",
  },
  description: "A demo storefront for the Metadata & SEO topic.",
  openGraph: {
    siteName: "Example Shop",
    images: ["/og-default.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header>ROOT-LAYOUT-MARKER</header>
        {children}
      </body>
    </html>
  );
}
