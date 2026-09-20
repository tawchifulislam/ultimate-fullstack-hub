# Position (relative, absolute, fixed, sticky)

**Topic 6 of 89** (Section: HTML / CSS, 6 of 8)

## Notes

### What does the `position` property do?

`position` controls how an element is placed on the page. Its default value is `static`, meaning the element follows normal document flow and the `top`, `right`, `bottom`, `left` offset properties have no effect on it. Any other value makes the element a "positioned element," which is what unlocks those offsets.

### relative

The element stays in normal document flow (the space it would have occupied is preserved), but can then be nudged from that position using `top`, `right`, `bottom`, or `left`. Nudging it does not affect the layout of surrounding elements at all; visually it can overlap them. `position: relative` on a parent is also the standard way to establish a positioning context for an absolutely positioned child.

### absolute

The element is removed from normal document flow entirely, so it no longer takes up space and surrounding elements collapse into the gap it left. It is then positioned relative to its nearest ancestor that is itself positioned (anything other than `static`); if no such ancestor exists, it is positioned relative to the initial containing block, which is effectively the page.

### fixed

Also removed from normal flow, but positioned relative to the viewport, so it stays in the same place on screen even as the page scrolls. One exception worth knowing: if an ancestor has a `transform`, `filter`, `perspective`, or similar property set, a fixed descendant positions relative to that ancestor instead of the viewport.

### sticky

A hybrid: the element behaves like `relative` until the page scrolls to the point where it would cross a threshold you set (commonly `top: 0`), and then it "sticks" in place like `fixed`, but only within its nearest scrollable ancestor. Once that ancestor scrolls out of view, the sticky element scrolls away with it. At least one offset (like `top`) must be set to something other than `auto`, or sticky behaves like plain `relative`.

### z-index and stacking

`z-index` only has an effect on positioned elements (anything other than `static`). Within the same stacking context, a higher `z-index` sits on top of a lower one; if `z-index` is not set, positioned elements later in the source order stack on top of earlier ones.

### Practical tips

- `position: relative` on a parent plus `position: absolute` on a child is the standard pattern for placing something precisely inside a container, for example a badge in the corner of a card.
- Sticky table headers and sticky section headings are the classic real-world use of `position: sticky`.
- Because absolute and fixed elements are removed from flow, remember to check that surrounding content does not get overlapped or lose its intended space.

## Resources

- MDN, position property reference: <https://developer.mozilla.org/en-US/docs/Web/CSS/position>
- MDN, Positioning (Learn web development): <https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Positioning>
- MDN, CSS positioned layout (module overview): <https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Positioned_layout>

## Practice / Exercises

- Build a card with a "New" badge pinned to its top-right corner using `position: relative` on the card and `position: absolute` on the badge.
- Build a page with a sticky section heading, then a fixed "back to top" button, and compare how each behaves while scrolling.

## Code Example

See [`06-position.html`](./06-position.html) in this folder.
