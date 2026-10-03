# useEffect and Lifecycle

**Topic 50 of 89** (Section: React, 8 of 16)

## Notes

### What useEffect is for

Rendering a component should be a pure calculation: given the same props and state, it returns the same JSX, with no side effects. Anything that reaches outside that, talking to the network, reading or writing `localStorage`, setting up a timer or a subscription, manually touching the DOM, is a "side effect," and `useEffect` is where that code belongs. React runs an effect after it has committed the render to the real DOM, not during rendering itself.

```tsx
useEffect(() => {
  document.title = `${count} unread messages`;
});
```

### The dependency array

The second argument controls when the effect re-runs:

- **No array at all**: runs after every single render.
- **An empty array `[]`**: runs exactly once, after the first render (mount).
- **`[value]`**: runs after the first render, and again any time `value` is different from what it was on the previous render (compared with `Object.is`, the same comparison React uses for state).

```tsx
useEffect(() => { /* every render */ });
useEffect(() => { /* once, on mount */ }, []);
useEffect(() => { /* on mount, and again whenever count changes */ }, [count]);
```

### Cleanup: running code before the next effect, and on unmount

If an effect returns a function, React treats that as cleanup. It is called right before the effect runs again (when its dependencies change), and one final time when the component unmounts. This is how a subscription, timer, or event listener set up in an effect gets properly torn down, including before being replaced by a new one.

```tsx
useEffect(() => {
  const unsubscribe = subscribeToChannel(channelId);
  return unsubscribe; // runs before the next effect, and on unmount
}, [channelId]);
```

### The function-component equivalent of class lifecycle methods

Older, class-based React components used named lifecycle methods. Function components express the same ideas with `useEffect` and its dependency array:

| Class lifecycle method | useEffect equivalent |
| --- | --- |
| `componentDidMount` | `useEffect(() => { ... }, [])` |
| `componentDidUpdate` (for a specific value) | `useEffect(() => { ... }, [value])` |
| `componentWillUnmount` | the cleanup function returned from `useEffect(() => { ... }, [])` |

### A classic bug: stale closures inside an effect

An effect's callback is a regular JavaScript closure, created once each time the effect runs. With an empty dependency array, that closure is created exactly once, at mount, and it keeps whatever values it captured then, forever, no matter how many times it is later invoked.

```tsx
function BrokenTicker() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setCount(count + 1); // "count" is permanently 0 here
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return <span>{count}</span>;
}
```

This ticker never advances past `1`. Every tick computes `0 + 1`, because the `count` inside that one closure is frozen at the value from mount. The fix is the same functional-update form introduced in the useState topic, it always receives the actual latest state, regardless of which render's closure is calling it:

```tsx
setCount((prev) => prev + 1); // reads the real current value every time
```

### Practical tips

- When an effect uses a value from props or state, include that value in the dependency array, omitting it is what causes stale-closure bugs like the one above. Most editors' React lint rules flag a missing dependency automatically.
- Not every calculation needs an effect. A value that can be computed directly from existing props or state during render should just be computed during render, reaching for `useEffect` there adds an unnecessary extra render and a moment where the UI is briefly out of date.
- An effect that creates something (a subscription, a timer, an event listener) should almost always return a cleanup function that undoes it, a missing cleanup is one of the most common sources of memory leaks and duplicate side effects in React apps.

## Resources

- React docs, Synchronizing with Effects: <https://react.dev/learn/synchronizing-with-effects>
- React docs, You Might Not Need an Effect: <https://react.dev/learn/you-might-not-need-an-effect>
- React docs, Lifecycle of Reactive Effects: <https://react.dev/learn/lifecycle-of-reactive-effects>

## Practice / Exercises

- Build a component that logs `"mounted"` once and `"unmounted"` once, using an empty-dependency effect with a cleanup function, verify both by mounting and then unmounting it.
- Reproduce the stale-closure ticker bug yourself, then fix it two different ways: the functional update form shown above, and by adding `count` to the dependency array instead (note how that second fix needs a new `setInterval` set up on every tick, and compare the trade-off).

## Code Example

See [`50-useeffect-lifecycle.tsx`](./50-useeffect-lifecycle.tsx) in this folder.
