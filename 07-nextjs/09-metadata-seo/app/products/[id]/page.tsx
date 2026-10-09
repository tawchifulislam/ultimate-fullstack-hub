// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: React, Next.js, and their type definitions are not installed in this
// learning resource.

import type { Metadata } from "next";
import { getProduct } from "../../../lib/products";

type Params = Promise<{ id: string }>;

// generateMetadata runs per-request, with the same params a page gets, so
// the <title>, description, and even the Open Graph image can depend on
// which product was requested instead of being fixed at build time.
export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const product = getProduct(id);

  if (!product) {
    return { title: "Product Not Found" };
  }

  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [`/products/${product.id}/og.png`],
    },
    alternates: {
      canonical: `/products/${product.id}`,
    },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { id } = await params;
  const product = getProduct(id);

  if (!product) {
    return (
      <main>
        <h1>Product Not Found</h1>
      </main>
    );
  }

  return (
    <main>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
    </main>
  );
}
