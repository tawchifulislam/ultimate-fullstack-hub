# Component Composition

**Topic 52 of 89** (Section: React, 10 of 16)

## Notes

### Composition over inheritance

React has no recommended pattern for extending a component the way a class extends a base class. Instead, complex UI is built by combining smaller, simpler components, "composing" them together. Almost everything that looks like it might need inheritance in an object-oriented language (a generic wrapper, a specific variant of something generic) is handled by composition in React.

### Containment: wrapping children without knowing what they are

A component that renders `{children}` (first introduced in the Components and Props topic) can wrap literally anything handed to it, it never needs to know in advance what will be inside.

```tsx
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <div className="card-body">{children}</div>
    </div>
  );
}

// The exact same Card, reused for completely different content:
<Card title="Welcome"><p>Thanks for signing up.</p></Card>
<Card title="Shopping List"><ul><li>Milk</li><li>Eggs</li></ul></Card>
```

### Specialization: building a specific component from a generic one

A more specific component can be built by composing a more generic one with particular content, rather than subclassing it. `ConfirmDialog` below is simply a `Dialog`, used with a fixed title and specific children, there is no inheritance relationship between them at all:

```tsx
function Dialog({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="dialog">
      <h2>{title}</h2>
      <div className="dialog-body">{children}</div>
    </div>
  );
}

function ConfirmDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <Dialog title="Please confirm">
      <p>Are you sure you want to continue?</p>
      <button onClick={onConfirm}>Yes</button>
      <button onClick={onCancel}>No</button>
    </Dialog>
  );
}
```

`ConfirmDialog` gets `Dialog`'s structure and styling for free, and only adds what makes it specific. A `FormDialog`, an `AlertDialog`, and so on could each compose `Dialog` the same way, each with its own content.

### Slots: more than one named region to fill

`children` covers the common case of a single region to fill. When a component has more than one distinct area to compose, for example a two-pane layout, each area can be its own prop that accepts JSX, rather than a single `children`:

```tsx
function SplitPane({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="split-pane">
      <div className="pane-left">{left}</div>
      <div className="pane-right">{right}</div>
    </div>
  );
}

<SplitPane left={<Sidebar />} right={<MainContent />} />
```

`SplitPane` never imports or knows anything about `Sidebar` or `MainContent`, it just arranges whatever JSX it is given into its two slots. The same `SplitPane` works for any pair of components passed into it.

### Composition as an alternative to prop drilling

The Context API topic solved passing a *value* deeply through a tree. Composition solves a related but different problem: passing already-rendered *JSX* through a component that does not care what it contains. A layout component that accepts `children` (or named slot props) does not need every value its content depends on threaded through it as props, the parent simply builds the JSX and hands it over already finished.

### Practical tips

- Reach for `children` first for "wrap arbitrary content," and named slot props only when a component genuinely has more than one distinct region to arrange.
- A component built through specialization (like `ConfirmDialog`) should still expose whatever the generic component needs to stay flexible (an `onConfirm` and `onCancel` here), composition does not mean hiding every detail, only avoiding duplication of structure.
- If many sibling components all need the exact same surrounding structure (a page header, consistent padding, a shared layout), a single wrapping component accepting `children` usually removes far more duplication than trying to configure one mega-component with many conditional props.

## Resources

- React docs, Passing Props to a Component (Specifying children): <https://react.dev/learn/passing-props-to-a-component#passing-jsx-as-children>
- React (legacy) docs, Composition vs Inheritance: <https://legacy.reactjs.org/docs/composition-vs-inheritance.html>

## Practice / Exercises

- Build a generic `Panel` component that accepts `children`, then build two specialized versions on top of it, `WarningPanel` and `SuccessPanel`, each supplying its own fixed title and styling classes.
- Build a `PageLayout` component with `header`, `sidebar`, and `content` slot props, then use it for two different "pages" with entirely different content in each slot.

## Code Example

See [`52-component-composition.tsx`](./52-component-composition.tsx) in this folder.
