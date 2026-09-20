# Responsive Design & Media Queries

**Topic 7 of 89** (Section: HTML / CSS, 7 of 8)

## Notes

### What is responsive design?

Responsive design means building a layout that adapts to different screen sizes, orientations, and devices, instead of shipping one fixed-width layout and hoping it works everywhere. It generally combines three ingredients: flexible layouts (Flexbox/Grid instead of fixed pixel widths), flexible media (images that scale with their container), and media queries (CSS that applies conditionally based on the viewport).

### The viewport meta tag

Mobile browsers, by default, render pages at a virtual desktop-like width (often 980px) and then zoom out to fit the real screen, which breaks media queries built around real device widths. Adding this tag to the `<head>` fixes that:

```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

It tells the browser to use the device's actual width as the viewport width, so `min-width`/`max-width` media queries behave as expected.

### Media query syntax

```css
@media (min-width: 768px) {
  /* styles applied at 768px and wider */
}
```

- `min-width`: applies from that width upward, the basis of mobile-first design.
- `max-width`: applies up to that width, the basis of desktop-first design.
- Conditions can be combined: `@media (min-width: 768px) and (max-width: 1024px) { ... }`.
- Other useful media features: `orientation: portrait` / `landscape`, `prefers-color-scheme: dark` / `light`, `prefers-reduced-motion: reduce`.

### Mobile-first vs desktop-first

Mobile-first means writing base styles for small screens first, then layering on complexity with `min-width` queries as the screen grows. It tends to produce leaner CSS and forces prioritizing what actually matters on a small screen. Desktop-first does the reverse: full-featured base styles, simplified with `max-width` queries for smaller screens.

### Choosing breakpoints

There is no single official set of breakpoints. Common rough ranges are small/mobile (under ~576px), tablet (~768px), and desktop (~1024px and up), but the better approach is to resize your own layout and add a breakpoint wherever your own content actually starts to look broken, rather than targeting specific device widths.

### Flexible images

```css
img {
  max-width: 100%;
  height: auto;
}
```

This lets an image shrink to fit its container on small screens while never growing past its own natural size.

### Fluid values with clamp()

`clamp(min, preferred, max)` lets a value scale smoothly between two bounds without a media query at all, for example:

```css
font-size: clamp(1rem, 2vw, 1.5rem);
```

This keeps font size fluid with the viewport, but never smaller than `1rem` or larger than `1.5rem`.

### Practical tips

- Pairing media queries with Grid's `repeat(auto-fit, minmax(...))` pattern (Topic 5) often removes the need for several breakpoints entirely.
- Test with Chrome DevTools' device toolbar and real device widths, not just by dragging a desktop browser window narrower.
- `clamp()` can often replace two or three media queries that only existed to adjust font size or spacing.

## Resources

- MDN, Responsive design (Learn web development): <https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design>
- MDN, Media query fundamentals (Learn web development): <https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Media_queries>
- MDN, viewport meta tag: <https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/viewport>

## Practice / Exercises

- Take a fixed-width layout you have built before and convert it to mobile-first, adding `min-width` media queries as the screen grows.
- Replace a font-size media query with a single `clamp()` value and compare the result while resizing the browser.

## Code Example

See [`07-responsive-design-media-queries.html`](./07-responsive-design-media-queries.html) in this folder.
