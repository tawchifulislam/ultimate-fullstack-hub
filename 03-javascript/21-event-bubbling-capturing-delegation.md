# Event Bubbling, Capturing, Delegation

**Topic 33 of 89** (Section: JavaScript, 21 of 26)

## Notes

### The three phases of event dispatch

When an event fires, it does not just run on the element it happened on, it travels through three phases in order:

1. **Capturing phase**: from `window` down through the target's ancestors, top to bottom.
2. **Target phase**: the event reaches the actual element it originated on.
3. **Bubbling phase**: back up from the target through its ancestors to `window`, bottom to top.

Event capturing is disabled by default. A listener only runs during the bubbling phase (the far more common case) unless it explicitly opts into capturing.

### Enabling the capturing phase

```js
element.addEventListener("click", handler, true);
// or, equivalently and more readable:
element.addEventListener("click", handler, { capture: true });
```

A capturing listener runs before any target-phase or bubbling-phase listener, useful when a parent genuinely needs to intercept an event before a child's own handler gets a chance to run.

### stopPropagation vs stopImmediatePropagation

- `event.stopPropagation()` stops the event from continuing to capture or bubble any further, but other listeners already attached to that *same* element for the same event still run.
- `event.stopImmediatePropagation()` does the same, and additionally prevents any other listener on that same element from running at all.
- Neither one prevents the browser's own default action (a link navigating, a checkbox toggling), that is what `event.preventDefault()` is for, a completely separate concern from propagation.

### Event delegation

Instead of attaching a listener to every individual child element, which is expensive for many elements and simply does not work for elements added later, attach one listener to a shared parent and inspect `event.target` to work out which specific child was actually interacted with.

```js
list.addEventListener("click", (event) => {
  const li = event.target.closest("li"); // nearest <li> ancestor, or itself
  if (li) console.log("clicked:", li.textContent);
});
```

This automatically covers elements added to the list afterward, since the listener lives on the parent, not on each child individually, and bubbling is exactly what carries the click up to it.

### event.target vs event.currentTarget

`event.target` is the actual element the event originated on, `event.currentTarget` is the element the listener is attached to (the parent, in a delegated setup). If an `<li>` contains a `<span>` and someone clicks the span, `event.target` is that `<span>`, while `event.currentTarget` stays the `<ul>`. Using `.closest("li")` on `event.target` handles this correctly regardless of how deeply nested the actual click landed.

### Practical tips

- Prefer delegation for any list or table where items are added or removed dynamically; one listener on the parent handles every current and future child automatically.
- Use `.closest()` rather than a direct `event.target.matches()` check whenever the clickable element might contain nested markup, icons, spans, and so on.
- Reach for `stopPropagation()` deliberately and rarely; it can make debugging harder later, since a parent's handler will silently stop firing for reasons that are not visible at the parent itself.

## Resources

- MDN, Event bubbling (Learn web development): <https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Event_bubbling>
- MDN, EventTarget.addEventListener(): <https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener>
- MDN, Event.stopPropagation(): <https://developer.mozilla.org/en-US/docs/Web/API/Event/stopPropagation>

## Practice / Exercises

- Build a list with a single delegated click listener on its parent that removes whichever `<li>` was clicked, then add new items dynamically and confirm the same listener still handles them.
- Nest three elements, add a click listener on each (bubbling phase), click the innermost one, and log the order the three handlers actually fire in.

## Code Example

See [`21-event-bubbling-capturing-delegation.html`](./21-event-bubbling-capturing-delegation.html) in this folder. This topic is DOM/browser-specific, so, like the DOM Manipulation and Debugging topics, it is meant to be opened in a browser rather than run with Node.
