# Debugging (Chrome DevTools)

**Topic 30 of 89** (Section: JavaScript, 18 of 26)

## Notes

### Beyond console.log

`console.log()` works, but real DevTools features are dramatically faster once a bug is anything more than trivial: pausing execution, inspecting live state, and watching values change over time all beat scattering and removing log lines by hand.

### Useful console methods beyond console.log

- `console.error()` / `console.warn()`: color-coded, and `console.error()` includes a stack trace automatically.
- `console.table(arrayOfObjects)`: renders an array of objects as an actual table, far easier to scan than a nested object dump.
- `console.group(label)` / `console.groupEnd()`: collapsible, nested groups of related log lines.
- `console.time(label)` / `console.timeEnd(label)`: a quick, no-setup way to measure how long a block of code takes.
- `console.count(label)`: counts how many times a line has been hit, useful for checking how often a function actually runs.

### Breakpoints: several kinds, not just one

- **Line-of-code breakpoints**: click a line number in the Sources panel; execution pauses there every time that line runs.
- **Conditional breakpoints**: right-click a line number and add a JavaScript expression; the breakpoint only fires when that expression is truthy, extremely useful inside a loop to pause only on, say, the 5th iteration (`i === 4`) or when a specific value shows up.
- **Logpoints**: same right-click menu as a conditional breakpoint, but instead of pausing, it logs a message to the Console when that line runs, without pausing and without editing the source file at all.
- **`debugger;` statement**: written directly in the source, it pauses execution at that exact point whenever DevTools is open, and does nothing at all otherwise. Still generally shouldn't be left in committed code.
- **DOM change breakpoints**: set from the Elements panel on a specific node, they pause execution in the Sources panel whenever that node (or its children, or an attribute) changes, useful when something is mutating the DOM and the responsible code isn't obvious.

### Stepping through paused code

- **Step over**: run the current line without entering any function it calls.
- **Step into**: if the current line calls a function, jump inside it.
- **Step out**: finish the current function immediately and return to its caller.
- **Resume**: continue running until the next breakpoint, or to the end.

### Inspecting state while paused

- The **Scope** panel shows every variable in the current local, closure, and global scope, live, at the exact paused moment.
- The **Call Stack** panel shows the full chain of calls that led here; clicking any frame jumps to that point and shows its local variables too.
- Hovering over a variable name directly in the source while paused shows its current value inline, no separate panel needed.

### Handy Console shortcuts

- `$0` refers to whatever element is currently selected in the Elements panel, letting you interact with it directly from the Console.
- `$_` holds the result of the last expression evaluated in the Console.
- Right-clicking any value in the Console and choosing "Store as global variable" saves it as `temp1`, `temp2`, and so on, for further poking around.

### The Elements and Network panels

- The Elements panel allows live-editing HTML and CSS directly in the browser to experiment, changes are not saved back to the actual source file.
- The Network panel lists every request the page makes, with status, timing, and headers; the "Preserve log" option keeps that list intact across page reloads and navigations, which otherwise clear it.

### Practical tips

- Reach for a conditional breakpoint or a logpoint before adding another `console.log()` line, they don't require editing (and later remembering to remove) the source.
- `console.table()` is worth using far more than most people do for any array of objects, it turns an unreadable nested dump into something instantly scannable.
- When a bug only reproduces after several iterations of a loop, a conditional breakpoint on that exact condition is almost always faster than manually stepping through every iteration.

## Resources

- Chrome for Developers, Pause your code with breakpoints: <https://developer.chrome.com/docs/devtools/javascript/breakpoints>
- Chrome for Developers, DevTools Tips: Breakpoints and logpoints: <https://developer.chrome.com/blog/devtools-tips-25>
- MDN, console: <https://developer.mozilla.org/en-US/docs/Web/API/console>

## Practice / Exercises

- Open `18-debugging.html` in Chrome, open DevTools (F12), and work through each numbered section's instructions directly in the browser.
- Set a conditional breakpoint inside the provided loop that only triggers on a specific iteration, then use the Scope panel to confirm the values at that exact point.

## Code Example

See [`18-debugging.html`](./18-debugging.html) in this folder. This topic needs an actual browser and its DevTools, so, unlike the Node-runnable `.js` files in earlier topics, this one is meant to be opened directly in Chrome rather than run from the command line.
