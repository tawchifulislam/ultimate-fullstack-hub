// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: React packages are not installed in this learning resource.

import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><div id="root"></div>');
(global as any).window = dom.window;
(global as any).document = dom.window.document;
Object.defineProperty(global, 'navigator', {
  value: dom.window.navigator,
  configurable: true,
});
(global as any).IS_REACT_ACT_ENVIRONMENT = true;

import React, { useState } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

// Rendering a list with .map() needs a "key" prop on each item, so React
// can match items between renders (to tell which were added, removed, or
// reordered), the same matching problem introduced in the Virtual DOM and
// Reconciliation topic, now specifically for lists.

interface TodoItem {
  id: number;
  text: string;
}

// Each item owns its own local state (whether its checkbox is checked),
// this makes the effect of the key choice visible: state belongs to
// whichever component instance React decides an item "is", not to the
// text currently displayed.
function Item({ text }: { text: string }) {
  const [isChecked, setIsChecked] = useState(false);
  return (
    <label>
      <input
        type="checkbox"
        checked={isChecked}
        onChange={() => setIsChecked(!isChecked)}
      />
      {text}
    </label>
  );
}

const container = document.getElementById('root') as HTMLDivElement;
const root = createRoot(container);

// --- The pitfall: using the array index as the key ---
function ListWithIndexKeys({ items }: { items: TodoItem[] }) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={index}>
          <Item text={item.text} />
        </li>
      ))}
    </ul>
  );
}

let todos: TodoItem[] = [
  { id: 1, text: 'Buy milk' },
  { id: 2, text: 'Walk dog' },
  { id: 3, text: 'Read book' },
];

act(() => {
  root.render(<ListWithIndexKeys items={todos} />);
});

// The user checks off the first item, "Buy milk".
let checkboxes = container.querySelectorAll('input[type=checkbox]');
act(() => {
  (checkboxes[0] as HTMLInputElement).click();
});

console.log('Index-as-key, before reordering:');
checkboxes = container.querySelectorAll('input[type=checkbox]');
checkboxes.forEach((cb, i) => {
  console.log(
    `  [${i}] "${todos[i].text}" checked = ${(cb as HTMLInputElement).checked}`,
  );
});

// Now "Walk dog" moves to the front of the list, nothing else about it changes.
todos = [
  { id: 2, text: 'Walk dog' },
  { id: 1, text: 'Buy milk' },
  { id: 3, text: 'Read book' },
];

act(() => {
  root.render(<ListWithIndexKeys items={todos} />);
});

console.log('\nIndex-as-key, after reordering (the bug):');
checkboxes = container.querySelectorAll('input[type=checkbox]');
checkboxes.forEach((cb, i) => {
  console.log(
    `  [${i}] "${todos[i].text}" checked = ${(cb as HTMLInputElement).checked}`,
  );
});
console.log(
  'The checked state stayed at position 0, it now incorrectly belongs to "Walk dog" instead of "Buy milk".',
);

// --- The fix: use a stable, unique id as the key ---
function ListWithIdKeys({ items }: { items: TodoItem[] }) {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>
          <Item text={item.text} />
        </li>
      ))}
    </ul>
  );
}

let todosForFix: TodoItem[] = [
  { id: 1, text: 'Buy milk' },
  { id: 2, text: 'Walk dog' },
  { id: 3, text: 'Read book' },
];

const fixContainer = document.createElement('div');
document.body.appendChild(fixContainer);
const fixRoot = createRoot(fixContainer);

act(() => {
  fixRoot.render(<ListWithIdKeys items={todosForFix} />);
});

let fixCheckboxes = fixContainer.querySelectorAll('input[type=checkbox]');
act(() => {
  (fixCheckboxes[0] as HTMLInputElement).click();
});

console.log('\nId-as-key, before reordering:');
fixCheckboxes = fixContainer.querySelectorAll('input[type=checkbox]');
fixCheckboxes.forEach((cb, i) => {
  console.log(
    `  [${i}] "${todosForFix[i].text}" checked = ${(cb as HTMLInputElement).checked}`,
  );
});

todosForFix = [
  { id: 2, text: 'Walk dog' },
  { id: 1, text: 'Buy milk' },
  { id: 3, text: 'Read book' },
];

act(() => {
  fixRoot.render(<ListWithIdKeys items={todosForFix} />);
});

console.log('\nId-as-key, after reordering (correct):');
fixCheckboxes = fixContainer.querySelectorAll('input[type=checkbox]');
fixCheckboxes.forEach((cb, i) => {
  console.log(
    `  [${i}] "${todosForFix[i].text}" checked = ${(cb as HTMLInputElement).checked}`,
  );
});
console.log(
  'The checked state correctly followed "Buy milk" to its new position.',
);
