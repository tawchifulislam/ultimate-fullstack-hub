# Custom Hooks

**Topic 54 of 89** (Section: React, 12 of 16)

## Notes

### What a custom hook is

A custom hook is simply a JavaScript function whose name starts with `use`, and which calls other hooks (`useState`, `useEffect`, `useRef`, or even other custom hooks) inside it. That naming convention is what lets both React and its tooling recognize it as a hook and apply the rules of hooks to it. A custom hook shares stateful *logic* between components, while component composition (the earlier topic) shares *UI*, the two solve different reuse problems.

```tsx
function useToggle(initial = false): [boolean, () => void] {
  const [value, setValue] = useState(initial);
  const toggle = () => setValue((v) => !v);
  return [value, toggle];
}

function ToggleButton() {
  const [isOn, toggle] = useToggle(false);
  return <button onClick={toggle}>{isOn ? "ON" : "OFF"}</button>;
}
```

Any component can call `useToggle()` and gets its own independent `value`/`toggle` pair, exactly as calling `useState` directly would, the hook just packages up the pattern once instead of repeating it in every component that needs an on/off flag.

### Extracting a pattern already seen inline

The "previous value" pattern from the useRef topic, a ref updated inside an effect, is reusable logic worth lifting into its own hook once more than one component needs it:

```tsx
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}
```

Every component that calls `usePrevious(someValue)` gets this behavior without re-implementing the ref and effect itself, this is the core benefit of custom hooks: the same few built-in hooks, recombined into a named, reusable piece of behavior.

### A more complete example: syncing state with an outside system

Combining `useState` (for the value a component renders) with `useEffect` (to keep something outside React, like `localStorage`, in sync with it) is a common and useful custom hook shape:

```tsx
function useLocalStorage(key: string, initialValue: string): [string, (v: string) => void] {
  const [value, setValue] = useState<string>(() => {
    const stored = window.localStorage.getItem(key);
    return stored !== null ? stored : initialValue;
  });
  useEffect(() => {
    window.localStorage.setItem(key, value);
  }, [key, value]);
  return [value, setValue];
}
```

Any component can now opt into "remembered across page reloads" state with a single call, `useLocalStorage("theme", "light")`, without knowing or caring how that persistence is implemented underneath.

### The rules of hooks, and why they are rules, not suggestions

Hooks must be called at the top level of a component or custom hook, never inside a condition, loop, or nested function, and always in the same order on every render. This is not just a style preference: React tracks each render's hooks by the order they are called in, to know which stored state belongs to which `useState`/`useRef` call. Calling a hook conditionally changes that order between renders, and React detects the mismatch and throws, loudly, rather than silently misbehaving:

```tsx
function BrokenConditionalHook({ showExtra }: { showExtra: boolean }) {
  const [a] = useState(0);
  if (showExtra) {
    const [b] = useState(0); // only called on some renders
  }
  return <div>{a}</div>;
}
```

Rendering this with `showExtra` first `true` then `false` throws `"Rendered fewer hooks than expected. This may be caused by an accidental early return statement."` at the point the hook call count changes. This is a runtime check performed by React itself, TypeScript's type checker has no concept of "hook call order" and will not catch this. Real projects normally also run the `eslint-plugin-react-hooks` lint rule, which catches a violation like this one while writing the code, well before it would ever run.

### Practical tips

- A custom hook's name must start with `use`, this is what makes the rules of hooks (and the lint rule that enforces them) apply to it, a function that calls hooks but is not named this way will not be checked correctly.
- Extract a custom hook once the same stateful pattern is genuinely duplicated in more than one component, not pre-emptively, a one-off `useState` call does not need its own hook.
- A custom hook can return whatever shape is most convenient for its callers, a tuple like `useState` does (`[value, setValue]`), or an object with named fields, there is no requirement to match the built-in hooks' own return shapes.

## Resources

- React docs, Reusing Logic with Custom Hooks: <https://react.dev/learn/reusing-logic-with-custom-hooks>
- React docs, Rules of Hooks: <https://react.dev/warnings/invalid-hook-call-warning>
- eslint-plugin-react-hooks: <https://www.npmjs.com/package/eslint-plugin-react-hooks>

## Practice / Exercises

- Write a `useCounter(initial = 0)` hook returning `{ count, increment, decrement, reset }`, then use it in two different components at once and confirm their counts are independent of each other.
- Reproduce the `BrokenConditionalHook` crash yourself, read the thrown error closely, then fix it by calling both `useState` calls unconditionally and moving the condition to how the second value is used instead of whether it is declared.

## Code Example

See [`12-custom-hooks.tsx`](./12-custom-hooks.tsx) in this folder.
