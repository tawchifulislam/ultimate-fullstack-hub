# useRef

**Topic 53 of 89** (Section: React, 11 of 16)

## Notes

### What useRef is for

`useRef(initialValue)` returns a plain, mutable object with a single property, `current`, set to that initial value. React keeps this same object alive across every render of the component, but, unlike `useState`, changing `ref.current` never causes a re-render, and the change takes effect immediately rather than being scheduled. A ref is for values a component needs to remember between renders that should not themselves drive what gets displayed.

```tsx
const countRef = useRef(0);
countRef.current++; // updates immediately, no re-render happens
```

### Accessing a DOM node directly

The most common use of `useRef` is reaching an actual DOM element, for things React's declarative model does not cover on its own: focusing an input, measuring an element's size, scrolling to a position, integrating a non-React library. Passing a ref to an element's `ref` attribute makes the real DOM node available as `ref.current` once React has committed it.

```tsx
function AutoFocusInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  return <input ref={inputRef} />;
}
```

### The pitfall: a ref cannot drive the UI

Because writing to `ref.current` does not schedule a re-render, displaying `ref.current` directly in JSX shows a stale value, the screen only catches up the next time the component happens to re-render for some unrelated reason.

```tsx
function BrokenDisplay() {
  const countRef = useRef(0);
  return (
    <div>
      <span>{countRef.current}</span>
      <button onClick={() => { countRef.current++; }}>Increment</button>
    </div>
  );
}
```

Clicking this button several times changes `countRef.current` correctly behind the scenes, but the number on screen never moves, there is nothing telling React this component needs to render again. Whenever a value needs to be reflected on screen, it needs to live in `useState` (or a parent's state), not a ref.

### A legitimate use for a frequently changing value: tracking "previous"

A ref updated inside `useEffect` is a reliable way to remember a prior render's value, since the effect runs after the DOM already reflects the current render, the ref still holds last render's value during the current render, and only gets updated to the current value afterward.

```tsx
function PreviousValueDemo({ value }: { value: number }) {
  const prevValueRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    prevValueRef.current = value;
  });
  return <div>Current: {value}, Previous: {prevValueRef.current ?? "none"}</div>;
}
```

On the very first render there is no previous value yet (the effect has not run), on every render after that, `prevValueRef.current` holds whatever `value` was one render ago.

### useRef vs useState, at a glance

- Changing state schedules a re-render and the new value appears in the next render; changing a ref does neither, it is just a mutable box.
- State should hold anything the component displays; a ref should hold things the component needs to remember internally but that have no visual representation on their own (a timer ID, a DOM node, a previous value used only for comparison).
- Reading or writing `ref.current` during the render itself (not inside an effect or an event handler) is discouraged, rendering is supposed to be a pure calculation, and a ref read during render can give a different answer on every call for reasons invisible to React.

## Resources

- React docs, Referencing Values with Refs: <https://react.dev/learn/referencing-values-with-refs>
- React docs, Manipulating the DOM with Refs: <https://react.dev/learn/manipulating-the-dom-with-refs>
- React docs, useRef: <https://react.dev/reference/react/useRef>

## Practice / Exercises

- Build a `StopwatchDisplay` that uses `useRef` to store an interval id (started and cleared correctly) and `useState` to hold the elapsed seconds actually shown on screen, notice why the elapsed time has to be state, not a ref.
- Reproduce the `BrokenDisplay` pitfall yourself, confirm with `data-testid` lookups that the span's text does not change after several clicks, then fix it by moving the count into `useState`.

## Code Example

See [`53-useref.tsx`](./53-useref.tsx) in this folder.
