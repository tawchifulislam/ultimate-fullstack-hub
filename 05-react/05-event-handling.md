# Event Handling

**Topic 47 of 89** (Section: React, 5 of 16)

## Notes

### Attaching event handlers

React events are passed as props, named in camelCase (`onClick`, `onChange`, `onSubmit`), and given a function to run. This mirrors plain JavaScript's `addEventListener` concept from the earlier DOM Manipulation and Event Bubbling topics, written as JSX attributes instead.

```tsx
function Counter() {
  const [count, setCount] = useState(0);

  function handleClick() {
    setCount((current) => current + 1);
  }

  return <button onClick={handleClick}>Count: {count}</button>;
}
```

### Pass the function, do not call it

`onClick={handleClick}` passes the function itself, to be called later on an actual click. `onClick={handleClick()}` calls `handleClick` immediately, during render, and hands React whatever it returns instead. If `handleClick` returns nothing (`void`), this is not just a logic bug, with a typed `onClick` prop it is also a TypeScript compile error:

```tsx
function handleClick(): void {
  console.log("clicked");
}

// Error: Type 'void' is not assignable to type
// 'MouseEventHandler<HTMLButtonElement> | undefined'. (TS2322)
<button onClick={handleClick()}>Click me</button>;
```

### Passing arguments to a handler

A handler referenced directly (`onClick={handleRemove}`) only ever receives the event object, it cannot also be given a custom argument that way. Wrapping it in an inline arrow function solves this, the arrow function itself is what gets passed to `onClick`, and it calls `handleRemove` with whatever argument is needed when it eventually runs:

```tsx
{items.map((item) => (
  <li key={item.id}>
    {item.text}
    <button onClick={() => handleRemove(item.id)}>Remove</button>
  </li>
))}
```

### The event object

A handler receives React's event object as its argument. It behaves like the native DOM event covered in earlier JavaScript topics; the most common members in everyday use are `e.target` (the element the event happened on) and `e.preventDefault()`.

```tsx
<input value={name} onChange={(e) => setName(e.target.value)} />
```

### Preventing default behavior

Submitting a `<form>` normally makes the browser navigate or reload the page. In a single-page app this is almost never wanted, `e.preventDefault()` inside the submit handler stops that default action while the rest of the handler still runs normally:

```tsx
<form
  onSubmit={(e) => {
    e.preventDefault();
    onSearch(query);
  }}
>
```

### Event bubbling still applies

React's events are still regular DOM events under the hood (React attaches a small number of listeners near the root of the page and routes events from there, rather than one listener per element, but the bubbling behavior itself is unchanged). Everything from the earlier Event Bubbling, Capturing, and Delegation topic, parent handlers see events from their children unless `stopPropagation()` is called, applies the same way here.

### Practical tips

- A missing `e.preventDefault()` on a form's submit handler is one of the most common beginner bugs, it shows up as the page reloading and all component state resetting.
- Prefer `onClick={() => doThing(id)}` over `onClick={doThing.bind(null, id)}` for passing arguments, both work, but the arrow function reads more clearly in JSX and is the convention used in practice.
- TypeScript's event types (`React.ChangeEvent<HTMLInputElement>`, `React.FormEvent<HTMLFormElement>`, and so on) are usually inferred automatically when the handler is written inline, as in the examples above, an explicit annotation is only needed when a handler is defined separately and passed in by reference.

## Resources

- React docs, Responding to Events: <https://react.dev/learn/responding-to-events>
- MDN, Event.preventDefault(): <https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault>
- React docs, event object type reference: <https://react.dev/reference/react-dom/components/common#react-event-object>

## Practice / Exercises

- Build a `LikeButton` that toggles between "Like" and "Liked" on click, using a single boolean piece of state and one handler, passed by reference rather than an inline arrow function.
- Build a small form with two inputs (title, amount) and a submit handler that calls `e.preventDefault()` and logs both values, then deliberately remove the `preventDefault()` call and observe what changes.

## Code Example

See [`05-event-handling.tsx`](./05-event-handling.tsx) in this folder.
