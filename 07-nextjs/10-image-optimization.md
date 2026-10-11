# Image Optimization

**Topic 70 of 89** (Section: Next.js, 10 of 10)

## Notes

### Project structure

```text
next.config.js                  -> images.remotePatterns allowlist
public/local-photo.png           -> 800x600 local image, statically imported
remote-assets/
  remote-photo.png                -> 1200x800 image
  server.js                       -> tiny HTTP server, run on two ports to test the allowlist
app/
  layout.tsx
  page.tsx                        -> three <Image> variants: priority local, lazy local, remote
```

`remote-assets/server.js` is run twice, once on port 4000 and once on port 4001, both serving the same file. `next.config.js` allowlists only port 4000, so the two ports stand in for "an approved image host" and "a random host on the internet."

### next/image vs a plain img

```tsx
import Image from "next/image";
import localPhoto from "../public/local-photo.png";

<Image id="hero-image" src={localPhoto} alt="Hero" placeholder="blur" priority />
```

`next/image` renders a real `<img>` tag, but wraps it with automatic lazy loading, responsive `srcSet` generation, and on-demand resizing and format conversion through a built-in `/_next/image` route, instead of shipping one fixed-size file to every device.

### Local images: width/height and blur placeholder are automatic

Importing an image file directly (`import localPhoto from "../public/local-photo.png"`) lets Next read the actual file at build time. Verified directly, with no `width`/`height` props supplied at all:

```html
<img id="hero-image" alt="Hero" width="800" height="600" ... />
```

800×600 is the real size of the source PNG. `placeholder="blur"` also needed no manual `blurDataURL`, Next generated one on its own, a tiny inline SVG with a Gaussian blur filter wrapping a few bytes of base64 image data, shown as the element's `background-image` until the real image loads.

### priority: removes lazy loading and preloads

The same local image rendered a second time, without `priority`, got `loading="lazy"` in its `<img>` tag; the `priority` version did not. `priority` also added a real resource hint to the page's `<head>`, verified directly:

```html
<link rel="preload" as="image" imageSrcSet="...w=828&q=75 1x, ...w=1920&q=75 2x"/>
```

Only images likely to be visible immediately (a hero image, a logo above the fold) should get `priority`, every one that does is fetched early at the cost of competing with everything else the initial page load needs.

### Remote images need an explicit size and an allowlisted host

A remote `src` can't be read from disk at build time, so `width` and `height` must be supplied by hand:

```tsx
<Image id="remote-image" src="http://localhost:4000/remote-photo.png" alt="Remote" width={1200} height={800} />
```

More importantly, Next refuses to optimize images from a host it doesn't recognize, to stop the image endpoint from being used as an open proxy for arbitrary URLs. `next.config.js` must list every allowed remote host:

```js
images: {
  remotePatterns: [{ protocol: "http", hostname: "localhost", port: "4000", pathname: "/**" }],
}
```

Verified directly, by calling `/_next/image` for the same file served from the allowed port and from a second, unlisted port:

```text
GET /_next/image?url=http://localhost:4000/remote-photo.png&w=256&q=75  -> HTTP 200
GET /_next/image?url=http://localhost:4001/remote-photo.png&w=256&q=75  -> HTTP 400
"url" parameter is not allowed
```

Same file, same request shape, the only difference is the port, and only the allowlisted one is served.

### The optimization is real: resizing and format conversion, verified by bytes

`/_next/image` isn't just relaying the original file. Requesting the 800×600 local image at `w=256` with `Accept: image/webp` returned an *actual* WebP file, resized to the requested width with the aspect ratio preserved:

```text
$ file out-local.bin
out-local.bin: RIFF (little-endian) data, Web/P image, VP8 encoding, 256x192, ...
```

256×192 is exactly 800×600 scaled to a width of 256 (4:3 preserved). The same test against the 1200×800 remote image at `w=256` produced a 256×171 WebP (3:2 preserved). The browser's `Accept` header is what Next uses to decide the output format; `q` controls quality the same way it would for a hand-run compressor.

### Practical tips

- Always set `priority` on, at most, the one or two images visible without scrolling; overusing it defeats the point of lazy loading everything else.
- Prefer a static `import` over a string path for local images specifically to get automatic width/height and blur placeholders for free.
- `remotePatterns` should be as narrow as the real source needs (a specific hostname and path prefix), not a wildcard, since anything it allows becomes fetchable and resizable through your server.
- Explicit `width`/`height` (or `fill` with a sized parent) exist to reserve layout space before the image loads, preventing the page from jumping around as images arrive, this is the `next/image` feature most directly tied to Cumulative Layout Shift, a real Core Web Vitals score.

## Resources

- next/image: <https://nextjs.org/docs/app/api-reference/components/image>
- Image Optimization: <https://nextjs.org/docs/app/building-your-application/optimizing/images>
- remotePatterns: <https://nextjs.org/docs/app/api-reference/components/image#remotepatterns>

## Practice

1. Add a second allowed entry to `remotePatterns` for port 4001 and confirm the previously-blocked request now succeeds.
2. Replace `priority` on the hero image with `loading="eager"` and compare the rendered HTML, notice `loading="eager"` alone does not add the `<link rel="preload">` that `priority` does.
3. Request `/_next/image` for the local image with a very low `q` (e.g. `q=10`) and a high one (`q=90`), compare the resulting file sizes with `ls -la`.
4. Swap `placeholder="blur"` for a string path image (not a static import) and observe Next either rejects it or requires a manually supplied `blurDataURL`, since there's no file to read ahead of time.
5. Change the local image's `<Image>` to use `fill` instead of `width`/`height`, inside a parent `div` with `position: relative` and a fixed size, and compare the rendered output.

## Code Example

- [next.config.js](./10-image-optimization/next.config.js)
- [app/layout.tsx](./10-image-optimization/app/layout.tsx)
- [app/page.tsx](./10-image-optimization/app/page.tsx)
- [public/local-photo.png](./10-image-optimization/public/local-photo.png)
- [remote-assets/remote-photo.png](./10-image-optimization/remote-assets/remote-photo.png)
- [remote-assets/server.js](./10-image-optimization/remote-assets/server.js)

To run it yourself: install `next`, `react`, `react-dom`, and `sharp` (required for `next start` to actually optimize images when self-hosting) in a project containing these files at its root. Start the remote image server twice, `node remote-assets/server.js 4000` and `node remote-assets/server.js 4001`, then `npx next build && npx next start` and open the page, or `curl` `/_next/image` directly with different `url`, `w`, and `q` query params to see the raw optimizer output.
