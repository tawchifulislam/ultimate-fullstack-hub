# 1. HTML / CSS

This is the first section of the Full Stack Skill Roadmap. It covers the foundation everything else in the stack builds on: giving a page meaningful structure with HTML, then controlling how that structure looks and behaves with CSS. Nothing here depends on JavaScript, a framework, or a backend; it is pure markup and styling, and it is worth mastering before moving on, since layout bugs later in React or Next.js are very often really CSS box model or specificity issues in disguise.

## Topics in this section

| # | Topic | What it covers | Files |
| --- | ------- | ----------------- | ------- |
| 1 | Semantic HTML | Choosing HTML elements by meaning (`header`, `nav`, `main`, `article`, `section`, `aside`, `footer`) instead of generic `div`s, for accessibility, SEO, and readable markup. | [Notes](./01-semantic-html.md) &middot; [Code](./01-semantic-html.html) |
| 2 | Box Model | How every element is built from content, padding, border, and margin; `box-sizing: content-box` vs `border-box`; margin collapsing; `outline` vs `border`. | [Notes](./02-box-model.md) &middot; [Code](./02-box-model.html) |
| 3 | Specificity & Cascade | How the browser decides which conflicting CSS rule wins: importance, then specificity (inline > id > class > element), then source order. Also covers inheritance. | [Notes](./03-specificity-cascade.md) &middot; [Code](./03-specificity-cascade.html) |
| 4 | Flexbox | One-dimensional layout along a single row or column: `justify-content`, `align-items`, `flex-grow`/`shrink`/`basis`, and common patterns like centering and navbars. | [Notes](./04-flexbox.md) &middot; [Code](./04-flexbox.html) |
| 5 | Grid | Two-dimensional layout, controlling rows and columns together: `grid-template-columns`/`rows`, named `grid-template-areas`, and responsive grids with `repeat(auto-fit, minmax(...))`. | [Notes](./05-grid.md) &middot; [Code](./05-grid.html) |
| 6 | Position (relative, absolute, fixed, sticky) | Taking an element out of (or nudging it within) normal document flow: `relative`, `absolute` (with its positioned-ancestor rule), `fixed`, `sticky`, and `z-index` stacking. | [Notes](./06-position.md) &middot; [Code](./06-position.html) |
| 7 | Responsive Design & Media Queries | Making a layout adapt across screen sizes: the viewport meta tag, `@media` queries, mobile-first vs desktop-first, flexible images, and fluid values with `clamp()`. | [Notes](./07-responsive-design-media-queries.md) &middot; [Code](./07-responsive-design-media-queries.html) |
| 8 | CSS Variables | Custom properties (`--name`, read with `var()`): how they differ from Sass/Less variables by following the cascade and updating live, used for theming and design tokens. | [Notes](./08-css-variables.md) &middot; [Code](./08-css-variables.html) |

## How the section fits together

HTML gives a page structure and meaning first (Topic 1). CSS then has to know which rule applies to which element when several rules could apply, which is what the cascade and specificity resolve (Topic 3), and every element it styles is fundamentally a box (Topic 2). Flexbox and Grid (Topics 4 to 5) are the two layout systems used to arrange those boxes in space, one-dimensional and two-dimensional respectively, and `position` (Topic 6) handles the layout needs that fall outside what either layout system is meant for, like overlays and sticky headers. Responsive design (Topic 7) makes all of the above adapt to different screen sizes instead of assuming one fixed viewport. CSS variables (Topic 8) sit across the whole system as a maintainability layer, letting values defined once be reused and swapped everywhere they are used, which is exactly what makes theming and consistent design tokens practical at scale.

## How each topic is structured

Every topic has two files:

- An explanation file (`.md`): what the concept is, why it matters, a resources list linking to MDN, and practice exercises.
- A matching code file (`.html`): a self-contained, runnable example with live demos and comments explaining each part, matching what the explanation describes.

## Suggested capstone exercise

Once all 8 topics are done, a good way to check they actually stuck is to build one small page that uses all of them together: a responsive personal profile page with a semantic structure (`header`/`nav`/`main`/`article`/`aside`/`footer`), a Flexbox navbar, a Grid-based content area, a sticky header while scrolling, at least one `@media` breakpoint, and a light/dark theme toggle driven by CSS variables.

## Next section

[Git & GitHub](../02-git-github/README.md)

[Back to main roadmap](../README.md)
