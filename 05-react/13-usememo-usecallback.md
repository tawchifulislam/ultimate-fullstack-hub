# useMemo and useCallback

**Topic 55 of 89** (Section: React, 13 of 16)

## Notes

### useMemo: memoizing a computed value

Every call to a component function re-runs its entire body, including any calculation written directly inside it, even when that render was triggered by something that has nothing to do with that calculation's own inputs. `useMemo(calculation, deps)` re-runs `calculation` only when a value in `deps` is different from the previous render, otherwise it reuses the previously computed result.

```tsx
function PriceSummary({ items, theme }: { items: Item[]; theme: string }) {
  const total = useMemo(() => {
    return items.reduce((sum, item) => sum + item.price, 0);
  }, [items]);
  return <div className={theme}>{total}</div>;
}
```

Here, `theme` changing alone (which still re-renders `PriceSummary`) does not re-run the reduction, only a genuine change to `items` does.

### useCallback: memoizing a function's identity

A function written directly inside a component body is a brand new function, a new reference, on every render, even if its code is identical every time. `useCallback(fn, deps)` returns the same function reference across renders as long as `deps` have not changed, it is really just `useMemo(() => fn, deps)` for the specific case of memoizing a function instead of a value.

```tsx
const handleSave = useCallback(() => {
  saveData(id);
}, [id]);
```

### Why identity matters: avoiding a child's wasted re-render

`React.memo` (covered in full in the next topic) skips re-rendering a component when its props have not changed. A function passed as a prop and re-created on every render defeats that optimization entirely, from the memoized child's perspective, it looks like a "new" prop every single time, even though the function does exactly the same thing:

```tsx
function Parent() {
  const [tick, setTick] = useState(0);
  const handleSave = () => {}; // a new function every render
  return <MemoizedChild onSave={handleSave} />; // "changes" every render
}
```

Wrapping `handleSave` in `useCallback` with the right dependencies keeps its reference stable across unrelated re-renders of `Parent`, letting `MemoizedChild` actually skip re-rendering when nothing it cares about changed.

### Do not reach for these by default

`useMemo` and `useCallback` are themselves not free, they add a dependency comparison on every render and a small amount of memory to remember the previous result. For a cheap calculation or a component that is not wrapped in `React.memo` and does not feed another hook's dependency array, wrapping it in `useMemo`/`useCallback` adds complexity and a small constant overhead without fixing any actual problem, there is nothing slow to prevent. These hooks solve two specific, concrete problems, an expensive recalculation, or a reference that needs to stay stable for another optimization or dependency array to work correctly, reach for them when one of those is actually true, not as a reflexive habit applied to every value and function in a component.

### Practical tips

- Profile or reason about an actual performance problem before reaching for `useMemo`, most calculations in a typical component are cheap enough that re-running them every render is not noticeable.
- `useCallback` is most useful specifically when a function is passed to a memoized child component or placed in another hook's dependency array, outside of those two cases it rarely changes anything observable.
- The dependency array rules are identical to `useEffect`'s, every value from component scope that the memoized calculation or function actually uses belongs in the array, omitting one reintroduces the same stale-closure risk covered in the useEffect topic.

## Resources

- React docs, useMemo: <https://react.dev/reference/react/useMemo>
- React docs, useCallback: <https://react.dev/reference/react/useCallback>
- React docs, You Might Not Need an Effect (the same "don't reach for it by default" reasoning applies to memoization): <https://react.dev/learn/you-might-not-need-an-effect>

## Practice / Exercises

- Build a component that filters a large array based on a search term prop, wrap the filtering in `useMemo`, then add an unrelated piece of state (like a dark mode toggle) in the same component and confirm with a call counter that filtering does not re-run when only the toggle changes.
- Reproduce the `BadParent`/`BadChild` wasted re-render yourself with a render counter, confirm the count climbs on unrelated updates, then fix it with `useCallback` and confirm the count stops climbing.

## Code Example

See [`13-usememo-usecallback.tsx`](./13-usememo-usecallback.tsx) in this folder.
