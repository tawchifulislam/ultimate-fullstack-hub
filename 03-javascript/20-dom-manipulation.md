# DOM Manipulation

**Topic 32 of 89** (Section: JavaScript, 20 of 26)

## Notes

### What is the DOM?

The Document Object Model is a live, tree-shaped representation of an HTML document that JavaScript can read and modify. Changing the DOM changes what is actually rendered on the page immediately, there is no separate "render" step to trigger.

### Selecting elements: static vs live results

- `document.querySelector(selector)` returns the first element matching a CSS selector, or `null` if nothing matches.
- `document.querySelectorAll(selector)` returns a **static** `NodeList`, a snapshot at the moment it was called. Elements added to the DOM afterward will not appear in it, even if they would now match the same selector.
- `getElementById(id)`, `getElementsByClassName(name)`, and `getElementsByTagName(name)` are older, but return a **live** `HTMLCollection` (except `getElementById`, which returns a single element): it automatically reflects later DOM changes, the same collection variable grows or shrinks as matching elements are added or removed. `getElementById` also looks up by id in O(1), versus the O(n) selector matching the `querySelector*` family does.

### Creating and inserting elements

```js
const li = document.createElement("li");
li.textContent = "New item";

list.append(li);            // modern; accepts multiple nodes or plain strings
list.appendChild(li);        // older; only a single Node, returns the appended node
parent.insertBefore(newNode, referenceNode);
existingElement.replaceWith(otherElement);
```

### textContent vs innerHTML

- `.textContent` reads or sets plain text; any markup-looking characters are automatically escaped, so it is always safe with untrusted input.
- `.innerHTML` reads or sets real HTML markup, actual tags get parsed and rendered. This is a genuine security risk with untrusted content: an `<img src=x onerror="...">` inserted this way will execute its handler, even though a literal `<script>` tag inserted via `innerHTML` will not run. Prefer `.textContent` by default, and never insert unsanitized user input through `.innerHTML`.

### Attributes and classes

```js
element.setAttribute("data-id", "42");
element.getAttribute("data-id");
element.removeAttribute("disabled");

element.classList.add("active");
element.classList.remove("hidden");
element.classList.toggle("open");
element.classList.contains("active");
```

`classList` is almost always cleaner than manually building or parsing the raw `className` string.

### Styles

```js
element.style.color = "red";
element.style.backgroundColor = "blue"; // camelCase for hyphenated CSS properties
```

Toggling a CSS class is usually preferable to setting many individual inline styles from JavaScript, it keeps styling in CSS and behavior in JS, and inline styles carry very high specificity that can be awkward to override later.

### Removing elements

```js
element.remove();               // modern, direct
parent.removeChild(element);    // older, requires the parent reference
```

### Traversing the DOM

```js
element.parentElement;
element.children;              // element children only, live HTMLCollection
element.childNodes;             // every child node, including text nodes, NodeList
element.nextElementSibling;
element.previousElementSibling;
```

### Practical tips

- Remember `querySelectorAll` gives a fixed snapshot; if elements are added afterward, re-query rather than expecting the original list to update.
- Batch DOM changes together where practical (build content in memory, then insert once) rather than making many small changes in a loop; each direct mutation can trigger extra layout work.
- Default to `textContent` for any text that came from user input, and only reach for `innerHTML` when real markup genuinely needs to be inserted.

## Resources

- MDN, Document.querySelectorAll(): <https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelectorAll>
- MDN, Element: innerHTML: <https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML>
- MDN, Introduction to the DOM: <https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Introduction>

## Practice / Exercises

- Build a small to-do list: an input, an "Add" button that creates a new `<li>` with `createElement` and `append`, and a way to remove an item by clicking it.
- Select the same set of elements with `querySelectorAll` and with `getElementsByClassName`, add a new matching element afterward, and confirm only one of the two variables reflects the new element.

## Code Example

See [`20-dom-manipulation.html`](./20-dom-manipulation.html) in this folder. Open it directly in a browser, this topic is DOM/browser-specific and cannot be demonstrated with a plain Node-run `.js` file.
