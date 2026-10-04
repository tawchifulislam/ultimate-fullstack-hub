# Context API

**Topic 51 of 89** (Section: React, 9 of 16)

## Notes

### The problem: prop drilling

Props flow one way, from parent to child. If a deeply nested component needs a value (the current theme, the logged-in user, a locale setting), every component in between has to accept that value as a prop and pass it further down, even if it never actually uses it itself. This is called "prop drilling," and it gets worse as the tree grows deeper or the value is needed in more places.

```tsx
function App() {
  return <Toolbar theme="blue" />;
}
function Toolbar({ theme }: { theme: string }) {
  return <ThemedButton theme={theme} />; // only passing it through
}
function ThemedButton({ theme }: { theme: string }) {
  return <button style={{ color: theme }}>Click</button>;
}
```

### Creating and providing context

`createContext` creates a context object with a default value. A `<SomeContext.Provider value={...}>` makes that value available to every component underneath it in the tree, however deeply nested, without it being passed as a prop at each level.

```tsx
const ThemeContext = createContext<ThemeContextValue>({
  color: "black",
  toggleColor: () => {},
});

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [color, setColor] = useState("blue");
  const toggleColor = () => setColor((c) => (c === "blue" ? "green" : "blue"));
  return (
    <ThemeContext.Provider value={{ color, toggleColor }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

### Reading context with useContext

Any descendant, at any depth, reads the current value with `useContext`, no prop passed down to it or through any component in between:

```tsx
function ThemedButton() {
  const theme = useContext(ThemeContext);
  return <button onClick={theme.toggleColor}>Current color: {theme.color}</button>;
}
```

`Toolbar`, sitting between `ThemeProvider` and `ThemedButton`, never needs to know a theme exists at all.

### The default value

The value passed to `createContext(...)` is used by any component that calls `useContext` without a matching `Provider` anywhere above it in the tree, this is useful for components that should still render sensibly in isolation (in a test, in a style guide) without being wrapped in every provider the app normally has.

### Updating context over time

A `Provider`'s `value` is not fixed, it is just a regular prop. Pairing it with `useState` in the component that owns the provider means updating that state (through a function included in the context value, as `toggleColor` is above) causes every consumer of that context to re-render with the new value, no matter how deep they are.

### A common pitfall: a fresh value object on every render

Writing `value={{ user, setUser }}` creates a brand new object literal every time the provider component renders, even when `user` itself has not changed. Since React decides whether a context consumer needs to update by comparing the new value to the old one by reference, every consumer re-renders whenever the provider re-renders for any reason at all, not just when the data they actually care about changes.

```tsx
function BadUserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState("Ada");
  // A new object every render, regardless of whether "user" changed.
  return <UserContext.Provider value={{ user, setUser }}>{children}</UserContext.Provider>;
}
```

Keeping the context value's identity stable fixes this. One direct way: hold the entire value object in its own `useState`, so React returns that exact same object on every render until its own setter is actually called:

```tsx
function GoodUserProvider({ children }: { children: React.ReactNode }) {
  const [value, setValue] = useState<UserContextValue>(() => ({
    user: "Ada",
    setUser: (newUser: string) => setValue((prev) => ({ ...prev, user: newUser })),
  }));
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
```

An unrelated re-render of the provider (triggered by some other piece of state nearby) no longer produces a new object, so consumers correctly skip re-rendering when nothing they read has actually changed. A later topic in this section, `React.memo` and performance optimization, covers this same idea (keeping values and functions referentially stable) in full detail.

### Practical tips

- Context is for values that many components across a subtree genuinely need (theme, authenticated user, locale), not a general replacement for passing props, most data should still just be a prop.
- Context does not make an app faster by itself, a context update re-renders every consumer under that provider, which is why the reference-stability pitfall above matters for any context value that changes somewhat often.
- An app can have several independent contexts (theme, user, language) rather than one giant context holding everything, this keeps each one's updates from affecting consumers that only care about a different piece of data.

## Resources

- React docs, Passing Data Deeply with Context: <https://react.dev/learn/passing-data-deeply-with-context>
- React docs, useContext: <https://react.dev/reference/react/useContext>
- React docs, createContext: <https://react.dev/reference/react/createContext>

## Practice / Exercises

- Build a `LanguageContext` with a default of `"en"`, provide `"bn"` from a top-level component, and read it from a component nested three levels deep with nothing in between passing it along.
- Reproduce the fresh-object-literal pitfall yourself with a small counter app, confirm with a render counter that an unrelated state change elsewhere in the provider causes consumers to re-render, then fix it and confirm the count stops increasing.

## Code Example

See [`51-context-api.tsx`](./51-context-api.tsx) in this folder.
