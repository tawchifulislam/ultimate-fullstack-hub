# Conditional Rendering

**Topic 45 of 89** (Section: React, 3 of 16)

## Notes

### Why conditional rendering?

A component often needs to show different JSX depending on props or state: a loading message while data is fetched, a login button versus a logout button, a badge only when there is something to show. Since JSX is just JavaScript, ordinary JavaScript control flow (`if`, ternaries, `&&`) is all that is needed, there is no separate "if" syntax inside JSX itself.

### Early return with if/else

Handling each case as its own `if` block with an early `return` keeps a component's main JSX simple, this scales better than nesting ternaries once there is more than one condition.

```tsx
function Status({ isLoading, data }: { isLoading: boolean; data: string | null }) {
  if (isLoading) {
    return <p>Loading...</p>;
  }
  if (data === null) {
    return <p>No data available.</p>;
  }
  return <p>Data: {data}</p>;
}
```

### Ternary operator inside JSX

The `condition ? a : b` ternary works directly inside `{}` in JSX. It fits well when choosing between exactly two small pieces of markup inline.

```tsx
function AuthButton({ isLoggedIn }: { isLoggedIn: boolean }) {
  return <button>{isLoggedIn ? "Log out" : "Log in"}</button>;
}
```

### Logical && for "render this or nothing"

`condition && <Thing />` renders `<Thing />` when `condition` is truthy, and renders nothing when it is falsy. This works because of how JavaScript's `&&` operator itself behaves: it evaluates to its second operand only when the first is truthy, otherwise it short-circuits and evaluates to the falsy first operand instead.

```tsx
function NotificationBadge({ count }: { count: number }) {
  return (
    <div>
      Inbox
      {count > 0 && <span className="badge">{count}</span>}
    </div>
  );
}
```

### A common pitfall: && with a number

React renders `false`, `null`, and `undefined` as nothing, but it renders numbers (including `0`) as visible text, because `0` is a perfectly valid, meaningful value to display. This means `count && <Thing />` is not the same as `count > 0 && <Thing />`:

```tsx
// When count is 0, this evaluates to 0 (not false), and React renders
// the literal text "0" on the page, a visible bug.
function BrokenBadge({ count }: { count: number }) {
  return <div>Inbox{count && <span className="badge">{count}</span>}</div>;
}
```

The fix is always to make the left side of `&&` an actual boolean (`count > 0`, `items.length > 0`, `value !== null`), rather than relying on a value's own truthiness when that value could legitimately be `0` or `""`.

### Returning null

A component can return `null` to render nothing at all, not even an empty element. This is different from returning an empty string or an empty `<></>`, `null` means "this component contributes nothing to the output."

```tsx
function Tooltip({ message }: { message: string | null }) {
  if (message === null) {
    return null;
  }
  return <div className="tooltip">{message}</div>;
}
```

### Practical tips

- Prefer early returns for genuinely different states of a component (loading, error, empty, loaded), prefer a ternary for a small inline choice within otherwise-shared JSX.
- Always turn the left side of `&&` into a real boolean comparison when the value could be `0`, `NaN`, or an empty string, otherwise that falsy-but-displayable value can leak onto the page as text.
- For more than two or three branches, a `switch` statement or a lookup object keyed by the condition is usually more readable than a chain of ternaries.

## Resources

- React docs, Conditional Rendering: <https://react.dev/learn/conditional-rendering>
- MDN, Logical AND (&&): <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Logical_AND>
- MDN, Conditional (ternary) operator: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Conditional_operator>

## Practice / Exercises

- Fix `BrokenBadge` yourself without looking at `NotificationBadge`, then confirm with `renderToStaticMarkup` that `count={0}` no longer renders a stray `0`.
- Write a `StatusLabel` component that takes a `status: "idle" | "loading" | "success" | "error"` prop and renders a different message for each, using a lookup object instead of a chain of `if`/`else if`.

## Code Example

See [`03-conditional-rendering.tsx`](./03-conditional-rendering.tsx) in this folder.
