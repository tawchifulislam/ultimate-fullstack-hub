// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: Next.js and its type definitions are not installed in this
// learning resource.

export type Product = {
  id: string;
  name: string;
  description: string;
};

const products: Product[] = [
  { id: "1", name: "Trail Running Shoes", description: "Lightweight shoes built for uneven terrain." },
  { id: "2", name: "Insulated Water Bottle", description: "Keeps drinks cold for 24 hours, hot for 12." },
];

export function getProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function getAllProductIds(): string[] {
  return products.map((p) => p.id);
}
