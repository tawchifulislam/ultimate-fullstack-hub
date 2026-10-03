# useState

**Topic 48 of 89** (Section: React, 6 of 16)

## Notes

### Why components need useState

A plain local variable inside a component function resets to its initial value every time that function runs again, it cannot remember anything between renders, and changing it does not cause React to render the component again at all. `useState` solves both problems: it gives a component a value React remembers across renders, and its setter function both updates that value and schedules a new render.

```tsx
import { useState } from "react";

function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <span>{count}</span>
      <button onClick={() => setCount(count + 1)}>+1</button>
    </div>
  );
}
```

`useState(0)` returns a pair: the current value (`count`) and a function to update it (`setCount`). Array destructuring is used purely by convention, so each call can name its own pair however fits.

### Stale closures, and the functional update form

Each render of a component creates its own fresh copy of every variable and function defined inside it, including any event handler. Inside one such handler, `count` is whatever value it was during the render that created that handler, it does not update mid-handler even if the state changes:

```tsx
function handleClick() {
  setCount(count + 1);
  setCount(count + 1);
  setCount(count + 1);
}
// All three calls read the same captured "count" from this render, so
// the state only ends up one higher, not three higher.
```

Passing a function to the setter instead of a value fixes this. React queues each update and guarantees that function receives the result of the update before it, not the value from whenever the handler was created:

```tsx
function handleClick() {
  setCount((prev) => prev + 1);
  setCount((prev) => prev + 1);
  setCount((prev) => prev + 1);
}
// Each "prev" is the actual, up to date pending value, so this correctly
// adds 3.
```

As a rule of thumb: whenever a new state value is computed from the previous one, use the functional form, `setCount((prev) => prev + 1)` rather than `setCount(count + 1)`.

### Never mutate state directly

React decides whether to re-render by comparing the new state value to the old one, and for objects and arrays that comparison is by reference, not by looking at their contents. Mutating an existing array or object and handing that same reference back to the setter looks like "nothing changed" to React, so it skips the re-render entirely:

```tsx
// Broken: same array reference before and after, React does not re-render.
items.push("c");
setItems(items);

// Correct: a new array, a new reference, React re-renders.
setItems([...items, "c"]);
```

The same applies to objects: `setUser({ ...user, name: "Ada" })` rather than `user.name = "Ada"; setUser(user)`.

### Lazy initial state

The expression passed to `useState(...)` for the initial value is evaluated on every render, even though React only ever uses the result of the very first one. For a cheap value like `0` or `""` this does not matter, but for a genuinely expensive computation it is wasted work on every re-render. Passing a function instead, `useState(() => expensiveComputation())`, tells React to call that function only once, on mount:

```tsx
// Runs the computation again on every render, result thrown away each
// time except the first.
const [value] = useState(computeExpensive());

// Runs the computation exactly once, on mount.
const [value] = useState(() => computeExpensive());
```

### Practical tips

- Each call to `useState` manages one independent piece of state. Prefer several separate `useState` calls for unrelated values over one large state object, it keeps updates simpler since there is no risk of accidentally dropping sibling fields.
- State declared with `useState` is local to one component instance, as already seen in the Keys and Lists topic, each rendered instance of a component keeps its own separate state, keyed by its position/identity in the tree.
- `setState` calls made inside the same event handler are batched by React into a single re-render, calling a state setter does not re-render the component immediately, mid-handler.

## Resources

- React docs, useState: <https://react.dev/reference/react/useState>
- React docs, Queueing a Series of State Updates: <https://react.dev/learn/queueing-a-series-of-state-updates>
- React docs, Updating Objects in State: <https://react.dev/learn/updating-objects-in-state>

## Practice / Exercises

- Build a `ShoppingCart` component with an array of item names in state, add an "Add Item" button using the broken (mutating) pattern, confirm nothing updates on screen, then fix it with a new array.
- Write a component with a button that calls a state setter five times in one handler using the plain value form, predict the final count, then change it to the functional form and confirm the difference.

## Code Example

See [`48-usestate.tsx`](./48-usestate.tsx) in this folder.
