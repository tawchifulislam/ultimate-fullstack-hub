# CSS Variables

**Topic 8 of 89** (Section: HTML / CSS, 8 of 8)

## Notes

### What are CSS Variables (Custom Properties)?

CSS custom properties, informally called "CSS variables," let you store a value once and reuse it anywhere in a stylesheet. A custom property name always starts with two dashes (`--`), and its value is read back with the `var()` function.

```css
:root {
  --primary-color: #3366cc;
  --spacing-unit: 8px;
}

.button {
  background: var(--primary-color);
  padding: calc(var(--spacing-unit) * 2);
}
```

### :root vs local scope

`:root` targets the document's root element (effectively `<html>`), which is the conventional place to define global variables; they then cascade down to every element unless something overrides them. A custom property can also be declared on any other selector, in which case it is only available to that element and its descendants.

### They follow the cascade and inherit

Unlike Sass or Less variables, CSS custom properties are real CSS properties: they participate in the normal cascade and inherit down the DOM tree by default. This means a more specific selector can override a variable's value for just one subtree, which makes them well suited to component-level theming: define a variable with a sensible default at a component's root class, then override it per instance or variant.

### var() with a fallback

```css
color: var(--text-color, black);
```

If `--text-color` is not defined (or resolves to an invalid value), the fallback `black` is used instead.

### Custom properties vs preprocessor variables

The key difference from Sass (`$var`) or Less (`@var`) variables is timing. Preprocessor variables are compiled away into static values before the CSS ever reaches the browser and cannot change afterward. CSS custom properties are resolved live, by the browser, so they can be changed at runtime, through media queries, `:hover`, a dark-mode toggle, or JavaScript, and the page updates instantly without a rebuild.

### A note on media queries

`var()` cannot be used to supply a value inside the media condition itself, so something like `@media (min-width: var(--breakpoint))` is not valid. You can, however, redefine a variable's value inside a media query block, which is itself a common and valid responsive technique:

```css
@media (min-width: 768px) {
  :root {
    --spacing-unit: 16px;
  }
}
```

### Practical use cases

- **Theming**: swap variable values inside a `[data-theme="dark"]` selector or `@media (prefers-color-scheme: dark)` to support light/dark mode.
- **Design tokens**: centralize colors, spacing, font sizes, and border-radius values for consistency across a project.
- **JavaScript access**: read or write a custom property with `element.style.setProperty('--x', value)` and `getComputedStyle(element).getPropertyValue('--x')`.

### Practical tips

- Prefix tokens by category on larger projects, for example `--color-primary`, `--spacing-sm`, to keep a growing list organized.
- Combine variables with `calc()` for derived values instead of hardcoding multiples.
- Custom property names are case-sensitive: `--my-color` and `--My-color` are two different properties.

## Resources

- MDN, Using CSS custom properties (variables): <https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascading_variables/Using_custom_properties>
- MDN, Custom properties (--*) reference: <https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/-->*
- MDN, var() function reference: <https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/var>

## Practice / Exercises

- Convert a page's hardcoded colors and spacing values into `:root` custom properties, then change the whole theme by editing just those declarations.
- Add a dark-mode toggle that swaps a handful of custom property values on a `data-theme` attribute.

## Code Example

See [`08-css-variables.html`](./08-css-variables.html) in this folder.
