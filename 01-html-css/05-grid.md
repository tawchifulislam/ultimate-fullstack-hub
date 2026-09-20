# Grid

**Topic 5 of 89** (Section: HTML / CSS, 5 of 8)

## Notes

### What is CSS Grid?

CSS Grid Layout is a two-dimensional layout system: it controls rows and columns together, unlike Flexbox, which only controls one axis at a time. Grid is the better tool whenever a layout genuinely needs both dimensions, page-level layouts, dashboards, image galleries, and card grids.

### Container vs items

Setting `display: grid` (or `inline-grid`) turns an element into a grid container; its direct children become grid items and are placed onto the grid automatically unless you position them explicitly.

### Defining the grid structure

- `grid-template-columns` / `grid-template-rows`: define the size of each column and row track, for example `grid-template-columns: 1fr 2fr 1fr;`.
- **The `fr` unit**: a fraction of the remaining free space in the grid container, after any fixed-size tracks are accounted for.
- `repeat()`: a shorthand for repeating patterns, for example `repeat(3, 1fr)` for three equal columns.
- `gap` (or `row-gap` / `column-gap`): spacing between rows and columns, without needing margin hacks.

### Placing items

- `grid-column` / `grid-row`: place an item using explicit line numbers, for example `grid-column: 1 / 3;` spans from line 1 to line 3.
- `grid-template-areas` + `grid-area`: name regions of the grid with quoted strings that visually resemble the layout, then assign each item to a named area with `grid-area: name;`. This is often far easier to read than juggling line numbers.
- Items that are not explicitly placed are auto-placed based on `grid-auto-flow` (`row` by default).

### Responsive grids with auto-fit and minmax()

A very common responsive pattern needs no media query at all:

```css
grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
```

This creates as many columns as fit, each at least 200px wide, stretching them to fill the row. `auto-fill` behaves similarly but leaves empty tracks if there is leftover space instead of stretching existing items into them.

### Alignment

- `justify-items` / `align-items`: align an item's content within its own grid cell.
- `justify-content` / `align-content`: align the entire grid within the container, relevant when the grid's total size is smaller than the container.

### Grid vs Flexbox

Use Grid when you need to control rows and columns together (overall page structure). Use Flexbox when you only need to align items along one row or column (a navbar, a toolbar, a group of buttons). The two combine well: a Grid for the page skeleton, with Flexbox used inside individual grid cells.

## Resources

- MDN, Basic concepts of grid layout: <https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Basic_concepts>
- MDN, Grid template areas: <https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Grid_template_areas>
- MDN, CSS grid layout (overview): <https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout>

## Practice / Exercises

- Build a classic page layout (header, sidebar, main content, footer) using `grid-template-areas`.
- Build a responsive card grid with `repeat(auto-fit, minmax(200px, 1fr))` and resize the browser window to watch columns appear and disappear.

## Code Example

See [`05-grid.html`](./05-grid.html) in this folder.
