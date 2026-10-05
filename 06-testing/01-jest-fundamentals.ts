// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: Jest and its type definitions are not installed in this learning resource.

// --- 1. test() / it(), and expect() matchers ---
// test (or its alias, it) names one check. expect(actual) is paired with a
// matcher describing what that value should satisfy.

function sum(a: number, b: number): number {
  return a + b;
}

test('sum adds two numbers', () => {
  expect(sum(2, 3)).toBe(5);
});

// --- 2. toBe vs toEqual ---
// toBe checks exact identity (the same comparison as Object.is, the same
// one React uses for state). toEqual checks deep equality, recursively
// comparing an object or array's contents instead of its reference.

function makePoint(x: number, y: number) {
  return { x, y };
}

test('toBe fails for two different objects with the same contents', () => {
  const a = makePoint(1, 2);
  const b = makePoint(1, 2);
  expect(a).not.toBe(b); // different objects, different references
  expect(a).toEqual(b); // same contents, deep equality passes
});

// --- 3. describe() groups related tests, and setup/teardown hooks ---
// beforeEach/afterEach run before and after every test in their describe
// block, beforeAll/afterAll run once for the whole block. This is the
// standard place to set up and clean up anything a group of tests shares.

describe('a counter', () => {
  let count: number;
  const log: string[] = [];

  beforeAll(() => {
    log.push('beforeAll');
  });

  beforeEach(() => {
    count = 0;
    log.push('beforeEach');
  });

  afterEach(() => {
    log.push('afterEach');
  });

  afterAll(() => {
    log.push('afterAll');
  });

  test('starts at zero', () => {
    expect(count).toBe(0);
    log.push('test: starts at zero');
  });

  test('can be incremented', () => {
    count += 1;
    expect(count).toBe(1);
    log.push('test: can be incremented');
  });

  test('hooks run in the expected order', () => {
    // By this point, both earlier tests have already run their own
    // beforeEach/afterEach pair, this confirms the exact order.
    expect(log).toEqual([
      'beforeAll',
      'beforeEach',
      'test: starts at zero',
      'afterEach',
      'beforeEach',
      'test: can be incremented',
      'afterEach',
      'beforeEach',
    ]);
  });
});

// --- 4. jest.fn(): mock functions ---
// jest.fn() creates a fake function that records how it was called, so a
// test can assert on that later without a real implementation behind it.

function notifyAll(callback: (message: string) => void, messages: string[]) {
  messages.forEach(message => callback(message));
}

test('jest.fn() records every call it receives', () => {
  const mockCallback = jest.fn();
  notifyAll(mockCallback, ['hello', 'world']);

  expect(mockCallback).toHaveBeenCalledTimes(2);
  expect(mockCallback).toHaveBeenNthCalledWith(1, 'hello');
  expect(mockCallback).toHaveBeenNthCalledWith(2, 'world');
});

test("a mock function's return value can be controlled", () => {
  const mockFetchUser = jest.fn().mockReturnValue({ id: 1, name: 'Ada' });
  const user = mockFetchUser();
  expect(user).toEqual({ id: 1, name: 'Ada' });
  expect(mockFetchUser).toHaveBeenCalledTimes(1);
});

// --- 5. Testing asynchronous code ---
// An async test function can simply await a promise and make assertions
// afterward, exactly like ordinary async/await code outside a test.

function fetchGreeting(name: string): Promise<string> {
  return Promise.resolve(`Hello, ${name}!`);
}

test('async/await works directly in a test', async () => {
  const greeting = await fetchGreeting('Ada');
  expect(greeting).toBe('Hello, Ada!');
});

test('resolves/rejects matchers work directly on the returned promise', async () => {
  await expect(fetchGreeting('Grace')).resolves.toBe('Hello, Grace!');
});

function fetchGreetingThatFails(): Promise<string> {
  return Promise.reject(new Error('network error'));
}

test('a rejected promise can be asserted on directly', async () => {
  await expect(fetchGreetingThatFails()).rejects.toThrow('network error');
});
