# Controlled vs Uncontrolled Components

**Topic 49 of 89** (Section: React, 7 of 16)

## Notes

### Controlled components

A controlled form element has its displayed value driven entirely by React state: the element's `value` always comes from a state variable, and an `onChange` handler updates that state on every change. React state is the single source of truth, the DOM element's own internal value is never read directly.

```tsx
function ControlledInput() {
  const [value, setValue] = useState("");
  return (
    <div>
      <input value={value} onChange={(e) => setValue(e.target.value)} />
      <p>You typed: {value}</p>
    </div>
  );
}
```

Every keystroke runs through `onChange`, updates state, and re-renders the component. This is what makes real-time validation, formatting as the user types, or disabling a submit button until a field is valid straightforward, the current value is always available in state.

### Uncontrolled components

An uncontrolled form element manages its own value internally, in the DOM, the way a plain HTML form always has. React sets only the starting value, with `defaultValue` (or `defaultChecked` for checkboxes/radios) instead of `value`, and then leaves the element alone. Typing into it does not run any React state update and does not cause a re-render at all.

```tsx
function UncontrolledInput() {
  return <input defaultValue="" />;
}
```

### Reading an uncontrolled value on demand

Since React is not tracking the value on every keystroke, it has to be read directly from the DOM when actually needed, typically at submit time. The browser's own `FormData` API is a convenient, idiomatic way to do this without touching individual elements:

```tsx
function UncontrolledForm({ onSubmitName }: { onSubmitName: (name: string) => void }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        onSubmitName(formData.get("name") as string);
      }}
    >
      <input name="name" defaultValue="Ada" />
      <button type="submit">Submit</button>
    </form>
  );
}
```

`FormData` reads whatever is currently in the DOM at the moment it is constructed, so it always returns the latest value the user typed, even though nothing was tracked along the way. Reading a single uncontrolled field outside of a submit handler, by its DOM node directly, is normally done with a ref, a tool for referencing a DOM node directly, covered in full in its own upcoming topic.

### Why the distinction matters

- Controlled components re-render on every keystroke, which is usually fine, but it does mean more render work for very large or very frequently updated forms.
- Uncontrolled components do less work per keystroke (no state update, no re-render), at the cost of not having the current value readily available until something actually goes and reads it.
- A `<input type="file">` is always uncontrolled, for security reasons a browser will not allow JavaScript to set its value, so a file input can never be given a `value` prop, only read (via a ref or `FormData`) after the user picks a file.

### Practical tips

- Most React forms are controlled by default, for validation, conditional rendering based on field values, or syncing fields to each other. Reach for uncontrolled only for simple cases (a search box with no live feedback, a form that only cares about final values on submit).
- Mixing the two on the same element causes React to warn about switching between a controlled and uncontrolled input, this usually happens by accident, passing `value={someVariable}` where `someVariable` can be `undefined` on the first render and a string afterward. Always supply a real default (`useState("")`, not `useState()`) to avoid it.
- A component can mix both patterns across its own different fields when that fits: a controlled field with live validation next to a plain uncontrolled one, nothing requires an entire form to pick a single style.

## Resources

- React docs, Sharing State Between Components: <https://react.dev/learn/sharing-state-between-components>
- React (legacy) docs, Uncontrolled Components: <https://legacy.reactjs.org/docs/uncontrolled-components.html>
- MDN, FormData: <https://developer.mozilla.org/en-US/docs/Web/API/FormData>

## Practice / Exercises

- Build a controlled `PasswordInput` that shows a live "too short" message while its length is under 8 characters.
- Convert that same input to uncontrolled, reading its final value only in a submit handler with `FormData`, and compare how much code each version needed.

## Code Example

See [`49-controlled-uncontrolled.tsx`](./49-controlled-uncontrolled.tsx) in this folder.
