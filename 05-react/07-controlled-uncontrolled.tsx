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
(global as any).FormData = dom.window.FormData;
(global as any).IS_REACT_ACT_ENVIRONMENT = true;

import React, { useState } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

function renderInNewContainer(element: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(element);
  });
  return { container, root };
}

function typeInto(input: HTMLInputElement, text: string) {
  const nativeSetter = Object.getOwnPropertyDescriptor(
    dom.window.HTMLInputElement.prototype,
    'value',
  )!.set!;
  act(() => {
    nativeSetter.call(input, text);
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
}

// --- Controlled component ---
// React state is the single source of truth: the input's displayed value
// always comes from "value", and every keystroke runs through onChange,
// which updates that state and causes a re-render.

let controlledRenderCount = 0;

function ControlledInput() {
  controlledRenderCount++;
  const [value, setValue] = useState('');
  return (
    <div>
      <input value={value} onChange={e => setValue(e.target.value)} />
      <p data-testid="echo">You typed: {value}</p>
    </div>
  );
}

const controlled = renderInNewContainer(<ControlledInput />);
const controlledInput = controlled.container.querySelector(
  'input',
) as HTMLInputElement;
typeInto(controlledInput, 'H');
typeInto(controlledInput, 'Hi');
typeInto(controlledInput, 'Hi!');

console.log(
  'Controlled echo after typing 3 characters:',
  controlled.container.querySelector('[data-testid="echo"]')?.textContent,
);
console.log(
  'Controlled component render count (1 mount + 3 keystrokes):',
  controlledRenderCount,
);

// --- Uncontrolled component ---
// The DOM itself owns the input's value. React sets only the starting
// value (defaultValue) and never touches it again, so typing does not
// run any React state update and does not cause a re-render.

let uncontrolledRenderCount = 0;

function UncontrolledInput() {
  uncontrolledRenderCount++;
  return <input defaultValue="" />;
}

const uncontrolled = renderInNewContainer(<UncontrolledInput />);
const uncontrolledInput = uncontrolled.container.querySelector(
  'input',
) as HTMLInputElement;
typeInto(uncontrolledInput, 'H');
typeInto(uncontrolledInput, 'Hi');
typeInto(uncontrolledInput, 'Hi!');

console.log(
  "\nUncontrolled input's actual DOM value after typing:",
  uncontrolledInput.value,
);
console.log(
  'Uncontrolled component render count (typing triggers no re-render):',
  uncontrolledRenderCount,
);

// --- Reading an uncontrolled value on demand, with FormData ---
// A common, practical pattern for uncontrolled forms: read values only when
// actually needed (here, on submit), using the browser's own FormData API
// instead of tracking every keystroke in React state.

function UncontrolledForm({
  onSubmitName,
}: {
  onSubmitName: (name: string) => void;
}) {
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        onSubmitName(formData.get('name') as string);
      }}
    >
      <input name="name" defaultValue="Ada" />
      <button type="submit">Submit</button>
    </form>
  );
}

let submittedName = '';
const form = renderInNewContainer(
  <UncontrolledForm onSubmitName={name => (submittedName = name)} />,
);

act(() => {
  (form.container.querySelector('button') as HTMLButtonElement).click();
});
console.log(
  '\nSubmitted name before editing (uses defaultValue):',
  submittedName,
);

typeInto(form.container.querySelector('input') as HTMLInputElement, 'Grace');
act(() => {
  (form.container.querySelector('button') as HTMLButtonElement).click();
});
console.log('Submitted name after typing, read at submit time:', submittedName);
