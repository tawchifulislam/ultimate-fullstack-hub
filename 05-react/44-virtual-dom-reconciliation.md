# Virtual DOM and Reconciliation

**Topic 44 of 89** (Section: React, 2 of 16)

## Notes

### Why not just manipulate the real DOM directly?

Real DOM nodes are expensive objects, browsers attach layout, style, and event information to each one. Directly querying and mutating many of them by hand (`document.createElement`, `appendChild`, `setAttribute`, over and over) works, as seen back in the plain JavaScript DOM Manipulation topic, but it gets hard to manage as an application grows: the code has to track exactly what changed and update only that, by hand, every time.

React takes a different approach: write a function that describes what the UI should look like for a given state, and let React figure out what actually needs to change in the real DOM. This is React's "declarative" model, as opposed to manually written "imperative" DOM code.

### What is the Virtual DOM?

The Virtual DOM is a lightweight, plain JavaScript object representation of the UI tree, essentially a tree of objects describing element types, props, and children, produced every time a component renders. It is not a faster or special version of the real DOM, it is just data, which makes it cheap to create and compare.

```tsx
// Calling this function does not touch the real DOM at all.
// It returns a plain JS object tree describing what SHOULD exist.
function Clock({ time }: { time: string }) {
  return (
    <div>
      <h1>Current time</h1>
      <span>{time}</span>
    </div>
  );
}
```

### Render phase and commit phase

Whenever state or props change, React re-renders: it calls the relevant component functions again and builds a new Virtual DOM tree. This is the **render phase**, it happens entirely in memory and produces no visible change yet.

React then compares ("diffs") this new tree against the previous one. This comparison process is called **reconciliation**. From that comparison, React computes the minimal set of real DOM operations needed, then applies exactly those operations to the actual browser DOM. This is the **commit phase**, it is the only point where the real, visible DOM changes.

### How reconciliation decides what to reuse

React's diffing follows a small number of practical rules at each position in the tree:

- **Same element type in the same position** (two `<span>` elements, or the same component function, rendered in the same spot across two renders): React keeps the existing real DOM node and updates only the attributes or text that actually changed.
- **Different element type in the same position** (a `<span>` becomes a `<p>`, or one component is swapped for a different one): React cannot safely reuse the old node, it removes it and builds a brand new real DOM node from scratch, along with everything inside it.
- **Lists of children**: when rendering a list, React needs a way to tell which item is which across renders, since items can be added, removed, or reordered. This is what the `key` prop is for, it is covered in its own topic shortly (Keys and Lists), since getting it wrong is a common source of bugs.

### Fiber, in brief

Modern React's internal reconciliation engine is called **Fiber**. Its main practical benefit is that rendering work can be split into small units, paused, prioritized, and resumed, rather than blocking the whole page until a big update finishes. The rules above (same type reuses, different type rebuilds) describe the diffing behavior a React developer actually needs to reason about day to day, Fiber is the internal mechanism that carries it out efficiently.

### What this means in practice

- The Virtual DOM is not "faster than the DOM" by itself, it is what lets React figure out the smallest necessary set of real DOM changes without the developer tracking that by hand.
- It does not make every update free: large trees, or lists re-keyed incorrectly, can still cause more work than necessary. Tools for addressing that (`React.memo`, `useMemo`, `useCallback`) come later in this section, once there is a reason to reach for them.
- Understanding this model explains why React state updates feel declarative: a component describes the current UI for the current state, and React handles turning that description into the right DOM changes.

### Running this topic's example

This example proves the reuse/rebuild rule above by actually inspecting real DOM node identity across renders, so it needs a real DOM. It uses `jsdom` to provide one in plain Node (the same approach used for earlier DOM-dependent JavaScript topics), plus `react-dom/client` to render into it:

```text
npm install react react-dom jsdom
npm install --save-dev typescript @types/react @types/react-dom @types/node @types/jsdom
npx tsc --jsx react-jsx --module commonjs --target es2020 --esModuleInterop --strict --types node,jsdom --outDir dist 44-virtual-dom-reconciliation.tsx
node dist/44-virtual-dom-reconciliation.js
```

## Resources

- React docs, Render and Commit: <https://react.dev/learn/render-and-commit>
- React (legacy) docs, Reconciliation: <https://legacy.reactjs.org/docs/reconciliation.html>
- React docs, `act`: <https://react.dev/reference/react/act>

## Practice / Exercises

- Predict, then verify by running the example, what happens if `Message` instead switched between two different custom components (e.g., `<Warning />` vs `<Info />`) rather than between `<span>` and `<p>`, does the DOM node get reused or rebuilt?
- Render a list of three `<li>` items from an array, log each `<li>` node's reference, then reverse the array and re-render without adding a `key` prop. Observe which DOM nodes get reused and which get recreated, this previews why the next topics (Conditional Rendering, then Keys and Lists) matter.

## Code Example

See [`44-virtual-dom-reconciliation.tsx`](./44-virtual-dom-reconciliation.tsx) in this folder.
