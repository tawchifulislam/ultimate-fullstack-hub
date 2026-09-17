# Box Model

**Topic 2 of 89** (Section: HTML / CSS, 2 of 8)

## Notes

### What is the CSS Box Model?

Every HTML element renders as a rectangular box made of four layers, from the inside out: content, padding, border, and margin.

- **Content**: the actual text, image, or other content, sized by the `width` and `height` properties.
- **Padding**: space between the content and the border. The background color or image of the element extends into the padding.
- **Border**: the line that wraps around the padding, with its own `width`, `style`, and `color`.
- **Margin**: transparent space outside the border, used to create distance from neighboring elements. Margin is never filled with background color.

### box-sizing: content-box vs border-box

By default (`box-sizing: content-box`), `width` and `height` apply only to the content area. Padding and border are added on top, so the element's total rendered size ends up larger than the `width` you set.

With `box-sizing: border-box`, `width` and `height` include the padding and border instead. This makes sizing far more predictable, especially with percentage widths, which is why a common reset is:

```css
* {
  box-sizing: border-box;
}
```

### Margin collapsing

When two block-level elements are stacked vertically, their touching top and bottom margins can collapse into a single margin equal to the larger of the two, not the sum of both. This only applies to vertical margins in normal document flow; it does not happen to horizontal margins, and it does not happen between flex or grid children.

### Debugging with DevTools

Chrome DevTools' Elements panel shows a live, color-coded box model diagram for any selected element, so you can read the exact content, padding, border, and margin sizes instead of guessing.

## Resources

- MDN, The box model (Learn web development): <https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Box_model>
- MDN, Introduction to the CSS box model: <https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_box_model/Introduction_to_the_CSS_box_model>
- MDN, Mastering margin collapsing: <https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_box_model/Mastering_margin_collapsing>

## Practice / Exercises

- Open DevTools on any webpage, select an element, and read its box model diagram in the Computed or Styles panel.
- Take a layout you've built with `content-box` and switch it to `border-box`; observe how the rendered size changes.

## Code Example

See [`02-box-model.html`](./02-box-model.html) in this folder.
