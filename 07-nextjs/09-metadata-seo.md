# Metadata & SEO

**Topic 69 of 89** (Section: Next.js, 9 of 10)

## Notes

### Project structure

```text
lib/products.ts                 -> tiny in-memory "database" of two products
app/
  layout.tsx                     -> root layout; exports the base `metadata` + title template
  page.tsx                       -> "/", uses the layout's default title untouched
  about/page.tsx                 -> static `metadata` export, title runs through the template
  products/[id]/page.tsx         -> generateMetadata(), per-product title/description/OG image
  sitemap.ts                     -> generates /sitemap.xml
  robots.ts                      -> generates /robots.txt
```

### Static metadata and the title template

```ts
// app/layout.tsx
export const metadata: Metadata = {
  metadataBase: new URL("https://example-shop.test"),
  title: {
    default: "Example Shop",
    template: "%s | Example Shop",
  },
  description: "A demo storefront for the Metadata & SEO topic.",
  openGraph: { siteName: "Example Shop", images: ["/og-default.png"] },
};
```

A plain object exported as `metadata` from a `layout.tsx` or `page.tsx` is statically read at build time and turned into the page's `<head>` tags: `<title>`, `<meta name="description">`, Open Graph tags, and more. `title.default` is what a route gets when it supplies no title of its own; `title.template` is applied to every title a *page* supplies, with `%s` replaced by that page's own title.

Verified directly:

- `GET /` (no metadata export) → `<title>Example Shop</title>`, the bare default, template not applied.
- `GET /about`, which sets `metadata = { title: "About" }` → `<title>About | Example Shop</title>`, the template applied.

### Dynamic metadata with generateMetadata

A page can export an async `generateMetadata({ params })` function instead of a plain object, whenever the metadata depends on something only known per-request, like a database lookup keyed by a route param:

```ts
// app/products/[id]/page.tsx
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const product = getProduct(id);
  if (!product) return { title: "Product Not Found" };
  return {
    title: product.name,
    description: product.description,
    openGraph: { title: product.name, description: product.description, images: [`/products/${product.id}/og.png`] },
    alternates: { canonical: `/products/${product.id}` },
  };
}
```

Verified directly, two different IDs produce two different `<head>`s, and a title returned from `generateMetadata` is run through the layout's template exactly like a static one:

```text
GET /products/1 -> <title>Trail Running Shoes | Example Shop</title>
GET /products/2 -> <title>Insulated Water Bottle | Example Shop</title>
GET /products/999 (no such product) -> <title>Product Not Found | Example Shop</title>
```

### metadataBase resolves relative URLs for you

`openGraph.images` and `alternates.canonical` above were written as relative paths (`/products/1/og.png`, `/products/1`), not full URLs. Because the root layout set `metadataBase`, Next.js resolves every relative metadata URL against it automatically. Verified directly:

```text
<link rel="canonical" href="https://example-shop.test/products/1"/>
<meta property="og:image" content="https://example-shop.test/products/1/og.png"/>
```

Without `metadataBase`, these would need to be written as full absolute URLs by hand everywhere, every time, which is easy to get wrong or forget when a domain changes.

### sitemap.ts and robots.ts are file conventions, not hand-written XML/text

A file named exactly `sitemap.ts` (or `.js`) at the `app/` root, default-exporting a function that returns a list of URLs, becomes a real `/sitemap.xml` route with no routing code needed. The same applies to `robots.ts` and `/robots.txt`. Verified directly:

```xml
<!-- GET /sitemap.xml -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>https://example-shop.test</loc><lastmod>2026-01-01T00:00:00.000Z</lastmod></url>
<url><loc>https://example-shop.test/about</loc>...</url>
<url><loc>https://example-shop.test/products/1</loc>...</url>
<url><loc>https://example-shop.test/products/2</loc>...</url>
</urlset>
```

```text
# GET /robots.txt
User-Agent: *
Allow: /
Disallow: /products/

Sitemap: https://example-shop.test/sitemap.xml
```

Both routes are built dynamically from `lib/products.ts`, the exact same data source the pages themselves use, so adding a third product automatically adds its URL to the sitemap with no extra step. Each route also came back with the right content type on its own: `application/xml` for the sitemap, `text/plain` for robots.txt, confirmed with `curl -I`.

### Practical tips

- Put `metadataBase` on the root layout once; every page's relative image and canonical URLs become correct automatically, in every environment, without hardcoding a domain per page.
- Reach for `generateMetadata` only when the metadata genuinely depends on per-request data; a plain `metadata` object is simpler and cheaper when it doesn't.
- A missing or wrong `alternates.canonical` is a common real-world SEO bug: without it, a product reachable at two different URLs (say, with and without a tracking query string) can get treated as duplicate content.
- Keep `robots.ts` and `sitemap.ts` reading from the same data source as the actual pages, as done here, so they can never drift out of sync with what the site actually serves.

## Resources

- Metadata Files and the Metadata Object: <https://nextjs.org/docs/app/building-your-application/optimizing/metadata>
- generateMetadata: <https://nextjs.org/docs/app/api-reference/functions/generate-metadata>
- sitemap.xml: <https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap>
- robots.txt: <https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots>

## Practice

1. Add a third product to `lib/products.ts` and confirm, with no other code changes, that it appears in both `/sitemap.xml` and as a working `/products/<id>` page with its own title.
2. Change `about/page.tsx`'s `metadata.title` to an object `{ absolute: "Just About" }` instead of a plain string, rebuild, and observe that `absolute` skips the template entirely, unlike a plain string title.
3. Remove `metadataBase` from the root layout, rebuild, and see how `og:image` and the canonical link render without it, then explain why that's a problem for a real production domain.
4. Change `robots.ts` to `disallow` everything except `/about`, and confirm the generated `/robots.txt` reflects it immediately.
5. Add `twitter: { card: "summary_large_image" }` to a product's `generateMetadata` return value and confirm the corresponding `<meta name="twitter:card">` tag appears.

## Code Example

- [lib/products.ts](./09-metadata-seo/lib/products.ts)
- [app/layout.tsx](./09-metadata-seo/app/layout.tsx)
- [app/page.tsx](./09-metadata-seo/app/page.tsx)
- [app/about/page.tsx](./09-metadata-seo/app/about/page.tsx)
- [app/products/\[id\]/page.tsx](./09-metadata-seo/app/products/%5Bid%5D/page.tsx)
- [app/sitemap.ts](./09-metadata-seo/app/sitemap.ts)
- [app/robots.ts](./09-metadata-seo/app/robots.ts)

To run it yourself: install `next`, `react`, and `react-dom` in a project containing these files at its root, then run `npx next build && npx next start` and use `curl` against `/`, `/about`, `/products/1`, `/products/2`, `/sitemap.xml`, and `/robots.txt` to see each piece of generated markup.
