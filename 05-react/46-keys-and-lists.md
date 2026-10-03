# Keys and Lists

**Topic 46 of 89** (Section: React, 4 of 16)

## Notes

### Rendering lists with .map()

JSX has no special list syntax, a list of elements is produced the ordinary JavaScript way, with `Array.prototype.map()`:

```tsx
function TodoList({ items }: { items: { id: number; text: string }[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>{item.text}</li>
      ))}
    </ul>
  );
}
```

### Why keys exist

As covered in the Virtual DOM and Reconciliation topic, React matches elements between renders to decide what to reuse and what to rebuild. For a list, position alone is not enough information: items can be added, removed, or reordered, and React needs a way to tell "this is the same item as before, just somewhere else" apart from "this is a brand new item." The `key` prop gives React that identity.

A `key` only needs to be unique among its direct siblings in that one list, not unique across the whole app.

### The pitfall: using the array index as the key

It is tempting to reach for the index `.map()` already provides:

```tsx
items.map((item, index) => <li key={index}>{item.text}</li>)
```

This works fine as long as the list never reorders and items are only ever added at the end. The moment items are reordered, inserted in the middle, or removed from anywhere but the end, the index of a given piece of data changes, so the index-based key now points React at the wrong identity. Concretely: if an item at index 0 carries local state (its own `useState`, an uncontrolled input's typed value, a CSS transition in progress), and the list is then reordered, React sees "index 0 again" and keeps reusing the same component instance there, along with its state, even though a completely different piece of data is now being displayed through it. The state does not move with the data, it stays stuck at the position.

### The fix: a stable, unique id as the key

Using an id that actually belongs to the data (a database id, a UUID generated once when the item was created) keeps identity correct regardless of where the item moves in the list:

```tsx
items.map((item) => <li key={item.id}>{item.text}</li>)
```

Now when data reorders, React matches each `key` to the item it already represents, moves the existing DOM node (and its state) to the new position, and nothing gets mixed up.

### When index-as-key is actually fine

If a list is strictly static (never reordered, filtered, or had items inserted anywhere but the end) and its items have no identity of their own and no per-item local state, using the index is harmless. The moment any of those conditions might change, reach for a real id instead, it costs nothing to use one from the start.

### Practical tips

- Never use `Math.random()` or a freshly generated value computed during render as a key, a new value on every render defeats the entire purpose, React would treat every item as brand new on every single render.
- A `key` is not a prop the component itself receives, it is consumed by React to manage the list and is not accessible as `props.key` inside the component.
- When data genuinely has no stable id yet (freshly typed-in form rows, for example), generate and store a stable id once when the row is created, rather than deriving one from its current position.

## Resources

- React docs, Rendering Lists: <https://react.dev/learn/rendering-lists>
- React docs, Keeping list items in order with key: <https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key>

## Practice / Exercises

- Reproduce the bug yourself: build a list of three checkboxes keyed by index, check the second one, then remove the first item from the array (not reorder, remove) and re-render. Predict which checkbox ends up checked before running it.
- Fix the same list by switching to id-based keys, and confirm the correct item stays checked after the removal.

## Code Example

See [`46-keys-and-lists.tsx`](./46-keys-and-lists.tsx) in this folder.
