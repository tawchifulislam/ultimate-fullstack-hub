# Flexbox

**Topic 4 of 89** (Section: HTML / CSS, 4 of 8)

## Notes

### What is Flexbox?

Flexbox (Flexible Box Layout) is a one-dimensional CSS layout model for arranging items in a single row or a single column, distributing space between them and aligning them even when their sizes are unknown or dynamic. For two-dimensional layouts (rows and columns together), CSS Grid is the better tool; that is the next topic.

### Container vs items

Setting `display: flex` (or `inline-flex`) on an element turns it into a flex container, and its direct children automatically become flex items. Every flex container has two axes:

- **Main axis**: the direction items are laid out in, set by `flex-direction` (`row` by default, also `row-reverse`, `column`, `column-reverse`).
- **Cross axis**: runs perpendicular to the main axis.

### Key container properties

- `flex-direction`: which way the main axis runs.
- `flex-wrap`: whether items wrap onto multiple lines (`nowrap` is the default, also `wrap`, `wrap-reverse`).
- `justify-content`: aligns items along the **main axis** (`flex-start`, `flex-end`, `center`, `space-between`, `space-around`, `space-evenly`).
- `align-items`: aligns items along the **cross axis** for a single line (`stretch` is the default, also `flex-start`, `flex-end`, `center`, `baseline`).
- `align-content`: aligns multiple wrapped lines along the cross axis; only matters once items wrap and there is extra space.
- `gap`: spacing between items, the modern replacement for margin-based spacing hacks.

### Key item properties

- `flex-grow`: how much an item grows to fill extra space relative to its siblings (default `0`, meaning it does not grow).
- `flex-shrink`: how much an item shrinks when space is tight relative to its siblings (default `1`).
- `flex-basis`: the item's starting size before grow or shrink is applied (default `auto`).
- `flex` shorthand: `flex: grow shrink basis`. `flex: 1` expands to `flex: 1 1 0`, a very common pattern meaning grow to fill available space.
- `align-self`: overrides `align-items` for one specific item.
- `order`: changes the visual order of an item without touching the underlying HTML order (default `0`).

### Common patterns

- Centering anything: `display: flex; justify-content: center; align-items: center;`
- Equal-width columns: put `flex: 1` on each item.
- Navbar with items pinned to both ends: `justify-content: space-between`.

### Practical tips

- Remember the axis mapping: `justify-content` controls the main axis, `align-items` controls the cross axis. If you switch `flex-direction` to `column`, these effectively swap which direction they visually control.
- `flex: 1` on every item is the fastest way to get equal-width, space-filling columns.
- Flexbox items shrink and grow based on content by default; set an explicit `flex-basis` when you need a fixed starting size.

## Resources

- MDN, Basic concepts of flexbox: <https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Flexible_box_layout/Basic_concepts>
- MDN, Flexbox (Learn web development): <https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Flexbox>
- MDN, flex property reference: <https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/flex>

## Practice / Exercises

- Build a navbar with a logo on the left and three links on the right using only `display: flex` and `justify-content`.
- Take a row of boxes with different `flex-grow` values and predict how the extra space will be split before checking in the browser.

## Code Example

See [`04-flexbox.html`](./04-flexbox.html) in this folder.
