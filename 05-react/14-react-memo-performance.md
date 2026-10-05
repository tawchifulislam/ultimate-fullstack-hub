# React.memo and Performance Optimization

**Topic 56 of 89** (Section: React, 14 of 16)

## Notes

### The default: a child re-renders whenever its parent does

By default, React re-renders a component every time its parent renders, regardless of whether that component's own props actually changed. This is a sensible default, most components are cheap enough that re-rendering them often has no noticeable cost, but it does mean a genuinely expensive component re-runs just as often as a trivial one unless something tells React otherwise.

### React.memo: skip re-rendering when props are shallowly equal

`memo(Component)` wraps a component so React compares its new props against its previous ones before re-rendering it. The comparison is shallow: each prop is compared with the same `Object.is` check React uses for state, and if every prop is equal, the re-render is skipped entirely.

```tsx
const MemoChild = memo(function MemoChild({ label }: { label: string }) {
  return <span>{label}</span>;
});
```

When a parent re-renders for an unrelated reason but passes `MemoChild` the exact same `label` value as before, `MemoChild` does not re-render at all, this is the entire mechanism `useMemo` and `useCallback` exist to support, by keeping object and function props referentially stable so this shallow comparison actually succeeds.

### A gotcha: children are a prop too

`children` is passed to a component the same way any other prop is, and JSX written inline between a component's tags is a new element, a new value, every time the surrounding component renders. Wrapping a component in `memo` does nothing to prevent its re-render if what changes every time is the `children` passed into it:

```tsx
<MemoWithChildren>
  <span>static content</span>
</MemoWithChildren>
```

Even though this looks the same on every render, the `<span>` JSX is freshly created each time the parent's function body runs, so `MemoWithChildren`'s `children` prop is a new value every time, and `memo` cannot help here on its own.

### A custom comparison function

`memo`'s optional second argument replaces the default shallow, per-prop comparison with a custom function, useful when a prop is an object whose actual values matter more than its reference:

```tsx
const CustomCompare = memo(
  function CustomCompare({ point }: { point: { x: number; y: number } }) {
    return <span>{point.x},{point.y}</span>;
  },
  (prevProps, nextProps) =>
    prevProps.point.x === nextProps.point.x && prevProps.point.y === nextProps.point.y
);
```

This lets `CustomCompare` correctly skip re-rendering even when it is handed a brand new `point` object every render, as long as its `x` and `y` values have not actually changed. This should be reached for sparingly: a comparison function that does meaningful work of its own can end up costing more than the re-render it was meant to avoid, for most cases, keeping a prop's reference stable with `useMemo` (covered in the previous topic) is simpler and cheaper than writing a custom comparator.

### When this is actually worth doing

Wrapping a component in `memo` is not free, it adds a comparison on every render in exchange for possibly skipping that render. It is worth doing for a component that is either expensive to render itself (a large list, complex charts, heavy calculations inside its own render), or that re-renders very often for reasons unrelated to its own props. For a small, cheap component, the comparison itself can cost about as much as just re-rendering it would have, `memo` is a targeted tool for a specific, identified cost, not a default wrapper to apply everywhere.

### Practical tips

- `memo` only helps when paired with stable props, an object or function prop re-created every render (the pattern covered in the Context API and useMemo/useCallback topics) defeats it just as easily as it defeats a plain shallow prop comparison anywhere else.
- Measure or reason about an actual rendering cost before adding `memo`, same as with `useMemo` and `useCallback`, it solves a specific, identifiable problem rather than being a general performance switch.
- `memo` compares props, not the component's own internal state or context values, a memoized component still re-renders normally when its own `useState` changes or when a context it reads changes.

## Resources

- React docs, memo: <https://react.dev/reference/react/memo>
- React docs, If a child re-renders even when its props haven't changed: <https://react.dev/reference/react/memo#my-component-rerenders-when-a-prop-is-an-object-or-array>
- React docs, Render and Commit (what "re-rendering" actually means): <https://react.dev/learn/render-and-commit>

## Practice / Exercises

- Build a list component with 50 items, wrap each item in `memo`, then update an unrelated counter in the parent and confirm with a render counter that the items do not re-render.
- Reproduce the `children` gotcha yourself, then fix it by lifting the children JSX out to a variable defined outside the re-rendering parent (or by passing primitive props instead of JSX), and confirm the render count stops climbing.

## Code Example

See [`14-react-memo-performance.tsx`](./14-react-memo-performance.tsx) in this folder.
