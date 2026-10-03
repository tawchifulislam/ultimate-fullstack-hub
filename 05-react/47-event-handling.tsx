// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: React packages are not installed in this learning resource.

import { JSDOM, VirtualConsole } from 'jsdom';

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

// --- 1. Passing a handler reference, not calling it ---
// An event prop (onClick, onChange, onSubmit, ...) must be given a function
// to call later, not the result of calling that function now. Writing
// onClick={handleClick()} runs handleClick immediately during render and
// hands React whatever it returns, usually not a function at all, instead
// of running it when the button is actually clicked.

function Counter() {
  const [count, setCount] = useState(0);

  function handleClick() {
    setCount(current => current + 1);
  }

  // Correct: pass the function itself.
  return (
    <div>
      <span data-testid="count">{count}</span>
      <button onClick={handleClick}>Increment</button>
    </div>
  );
}

const counterContainer = document.getElementById('root') as HTMLDivElement;
const counterRoot = createRoot(counterContainer);
act(() => {
  counterRoot.render(<Counter />);
});

const incrementButton = counterContainer.querySelector(
  'button',
) as HTMLButtonElement;
act(() => {
  incrementButton.click();
  incrementButton.click();
  incrementButton.click();
});
console.log(
  'Counter after 3 clicks:',
  counterContainer.querySelector('[data-testid="count"]')?.textContent,
);

// --- 2. Passing arguments to a handler ---
// Wrapping the call in an inline arrow function is the standard way to pass
// extra arguments: () => handleRemove(item.id) is itself a function, so
// React calls it on click, and it in turn calls handleRemove with the id.

interface TodoItem {
  id: number;
  text: string;
}

function TodoList() {
  const [items, setItems] = useState<TodoItem[]>([
    { id: 1, text: 'Buy milk' },
    { id: 2, text: 'Walk dog' },
    { id: 3, text: 'Read book' },
  ]);

  function handleRemove(id: number) {
    setItems(current => current.filter(item => item.id !== id));
  }

  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>
          {item.text}
          <button onClick={() => handleRemove(item.id)}>Remove</button>
        </li>
      ))}
    </ul>
  );
}

const listContainer = document.createElement('div');
document.body.appendChild(listContainer);
const listRoot = createRoot(listContainer);
act(() => {
  listRoot.render(<TodoList />);
});

console.log(
  '\nTodo items before removing:',
  Array.from(listContainer.querySelectorAll('li')).map(li => li.textContent),
);

// Remove the middle item ("Walk dog") by clicking its own Remove button.
const removeButtons = listContainer.querySelectorAll('li button');
act(() => {
  (removeButtons[1] as HTMLButtonElement).click();
});

console.log(
  'Todo items after removing the middle one:',
  Array.from(listContainer.querySelectorAll('li')).map(li => li.textContent),
);

// --- 3. The event object: reading e.target.value ---
// A handler receives React's event object as its argument, with the same
// shape as a native DOM event (e.target, e.preventDefault(), and so on).

function NameInput() {
  const [name, setName] = useState('');
  return (
    <div>
      <input
        data-testid="name-input"
        value={name}
        onChange={e => setName(e.target.value)}
      />
      <p data-testid="greeting">Hello, {name || 'stranger'}!</p>
    </div>
  );
}

const inputContainer = document.createElement('div');
document.body.appendChild(inputContainer);
const inputRoot = createRoot(inputContainer);
act(() => {
  inputRoot.render(<NameInput />);
});

const nameInput = inputContainer.querySelector(
  '[data-testid="name-input"]',
) as HTMLInputElement;

// The next two lines simulate a user typing. They exist only because this
// script runs in plain Node through jsdom, not a real browser, a real
// browser's own typing already triggers onChange correctly on its own. The
// native setter is needed here so React notices the value actually changed.
const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
  dom.window.HTMLInputElement.prototype,
  'value',
)!.set!;

act(() => {
  nativeInputValueSetter.call(nameInput, 'Ada');
  nameInput.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
});
console.log(
  '\nGreeting after typing a name:',
  inputContainer.querySelector('[data-testid="greeting"]')?.textContent,
);

// --- 4. e.preventDefault() on a form submission ---
// Submitting a form normally navigates the page (or reloads it). In a
// single-page app this is almost never wanted, calling preventDefault()
// inside the submit handler stops that default browser behavior while
// still letting the handler's own code run.

function SearchForm({ onSearch }: { onSearch: (query: string) => void }) {
  const [query, setQuery] = useState('');
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onSearch(query);
      }}
    >
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <button type="submit">Search</button>
    </form>
  );
}

// A virtual console lets this script detect jsdom's own "page navigation
// was attempted" warning, which is how the demo below proves preventDefault
// actually stopped the browser's default form submission.
const jsdomWarnings: string[] = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', err => jsdomWarnings.push(err.message));

const formDom = new JSDOM('<!doctype html><div id="root"></div>', {
  virtualConsole,
});
(global as any).window = formDom.window;
(global as any).document = formDom.window.document;
Object.defineProperty(global, 'navigator', {
  value: formDom.window.navigator,
  configurable: true,
});

let searchedFor = '';
const formContainer = formDom.window.document.getElementById(
  'root',
) as HTMLDivElement;
const formRoot = createRoot(formContainer);
act(() => {
  formRoot.render(<SearchForm onSearch={q => (searchedFor = q)} />);
});

// Type "react hooks" into the search box, then submit the form.
const searchInput = formContainer.querySelector('input') as HTMLInputElement;
const formNativeSetter = Object.getOwnPropertyDescriptor(
  formDom.window.HTMLInputElement.prototype,
  'value',
)!.set!;
act(() => {
  formNativeSetter.call(searchInput, 'react hooks');
  searchInput.dispatchEvent(
    new formDom.window.Event('input', { bubbles: true }),
  );
});

const submitButton = formContainer.querySelector(
  'button[type="submit"]',
) as HTMLButtonElement;
act(() => {
  submitButton.click();
});

console.log('\nSearched for:', JSON.stringify(searchedFor));
console.log(
  'Browser attempted a real page navigation (should be false):',
  jsdomWarnings.some(message => message.includes('requestSubmit')),
);
