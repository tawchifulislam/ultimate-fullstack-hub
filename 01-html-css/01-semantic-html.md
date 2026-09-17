# Semantic HTML

**Topic 1 of 89** (Section: HTML / CSS, 1 of 8)

## Notes

### What is Semantic HTML?

Semantic HTML means choosing HTML elements whose names describe the meaning or purpose of the content they wrap, not just how they look. `<div>` and `<span>` carry no built-in meaning, but `<header>`, `<nav>`, `<article>`, and `<footer>` each have a specific role.

### Why it matters

1. **Accessibility and SEO**: using the correct semantic element communicates the purpose and structure of the content, which matters for both accessibility tools and search engines.
2. **Screen reader navigation**: screen reader users can jump directly between landmark regions such as header, nav, and main.
3. **Separation from presentation**: HTML should reflect the structure of the data, not the default visual style. How something looks is entirely CSS's job.
4. **Maintainability**: reading the markup tells you what each part does, which is far clearer than a page built entirely from generic divs.

### Core landmark elements

HTML has roughly a hundred semantic elements in total. The ones used most often in everyday layout:

- **header**: the intro area of a page or section (logo, navigation)
- **nav**: a group of primary navigation links
- **main**: the unique, primary content of the page; should appear once per page
- **article**: self-contained content that could be distributed on its own (a blog post, a news item, a comment)
- **section**: a thematic grouping, usually with its own heading (h2 to h6)
- **aside**: content indirectly related to the main content (a sidebar, related links)
- **footer**: the closing area of a page or section
- **figure / figcaption**: an image or diagram paired with its caption
- **time**: a machine-readable date or time, via the `datetime` attribute

### Rules of thumb

- Use `<section>` only when it has its own heading; otherwise a plain `<div>` is fine.
- Use `<article>` when the content could stand alone in an RSS feed.
- Use `<main>` once per page, generally with a single `<h1>` inside it.

### Common mistakes

Wrapping everything in divs ("div soup"), or using `<section>` without a heading.

## Resources

- MDN, HTML elements reference: <https://developer.mozilla.org/en-US/docs/Web/HTML/Element>
- MDN, Semantics (Glossary): <https://developer.mozilla.org/en-US/docs/Glossary/Semantics>
- MDN Curriculum, Semantic HTML module: <https://developer.mozilla.org/en-US/curriculum/core/semantic-html/>

## Practice / Exercises

- Take an old div-heavy page you've written and refactor it with semantic tags.
- Open Chrome DevTools, go to Elements then Accessibility, and compare the accessibility tree for semantic vs non-semantic markup.

## Code Example

See [`01-semantic-html.html`](./01-semantic-html.html) in this folder.
