# Specificity & Cascade

**Topic 3 of 89** (Section: HTML / CSS, 3 of 8)

## Notes

### What is the Cascade?

CSS stands for Cascading Style Sheets. When more than one rule targets the same element and the same property, the cascade is the algorithm the browser uses to decide which declaration actually gets applied. It resolves conflicts in this order:

1. **Origin and importance**: `!important` declarations beat normal ones; author stylesheets normally beat the browser's default (user agent) styles.
2. **Specificity**: how specific the selector is, calculated as described below.
3. **Source order**: if specificity is still tied, whichever rule appears later in the CSS wins.

### How specificity is calculated

Specificity is usually written as a set of counts, from highest weight to lowest:

- **Inline styles** (`style="..."` on an element): beats any selector-based rule.
- **IDs** (`#id`): counted next.
- **Classes, attributes, and pseudo-classes** (`.class`, `[type="text"]`, `:hover`): counted next.
- **Elements and pseudo-elements** (`div`, `::before`): counted last, lowest weight.

More IDs always beat more classes, and more classes always beat more element selectors, no matter how many lower-weight selectors are stacked. For example, `#nav .item` (one ID, one class) beats `div div div .item` (zero IDs, one class, three elements), even though the second selector looks longer.

### Selectors with zero specificity

The universal selector (`*`), combinators (`>`, `+`, `~`, and the space descendant combinator), and the `:not()` pseudo-class itself add no specificity. Note that the selectors written inside `:not()` still count normally.

### Inheritance is separate from the cascade

Some properties, like `color` and `font-family`, inherit from parent to child by default when nothing else sets them. Others, like `margin` and `border`, never inherit. Inheritance only fills in a value when the cascade found no matching rule for that element; it does not override a rule that did match.

### Practical tips

- Avoid `!important` and long ID-based chains; they are hard to override later and make debugging painful.
- Keep selectors as flat and low-specificity as possible; prefer a single class over nested element chains.
- When a style is not applying and you cannot tell why, check specificity first, then source order.

## Resources

- MDN, Specificity: <https://developer.mozilla.org/en-US/docs/Web/CSS/Specificity>
- MDN, Introduction to the CSS cascade: <https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascade/Introduction>
- MDN, Handling conflicts (Learn web development): <https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Handling_conflicts>

## Practice / Exercises

- Write two conflicting rules for the same element with different specificity and predict which one wins before checking in the browser.
- Open DevTools on any page, find a crossed-out (overridden) style in the Styles panel, and work out why it lost.

## Code Example

See [`03-specificity-cascade.html`](./03-specificity-cascade.html) in this folder.
