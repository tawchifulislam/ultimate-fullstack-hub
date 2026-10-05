# Jest Fundamentals

**Topic 59 of 89** (Section: Testing, 1 of 2)

## Notes

Jest is a test runner: it finds files that look like tests, runs them, and reports which ones passed or failed. A file is treated as a test file by its name, usually `*.test.ts` or inside a `__tests__` folder. Nothing special has to be imported to use `test`, `expect`, `describe`, or `jest` itself, Jest injects these as global functions into every test file automatically when it runs.

### test() and expect()

`test(name, fn)` (or its alias `it(name, fn)`) names a single check and provides the function that performs it. Inside that function, `expect(actualValue)` returns an object with matcher methods, like `.toBe(expectedValue)`, that describe what the value should satisfy. If the matcher's condition fails, the test fails and Jest prints a readable diff of what was expected versus what was received.

```ts
test("sum adds two numbers", () => {
  expect(sum(2, 3)).toBe(5);
});
```

### toBe vs toEqual

These two matchers are easy to mix up, and choosing the wrong one either makes a test fail when it shouldn't, or pass when it shouldn't.

- `toBe` checks exact identity, the same comparison `Object.is` performs (and the same one React uses to decide whether state actually changed). For primitives like numbers and strings this is the comparison most people expect. For objects and arrays, two different objects with identical contents are NOT `toBe` each other, because they are two different references in memory.
- `toEqual` checks deep equality: it recursively compares the contents of an object or array instead of its reference. Two different objects with the same keys and values pass `toEqual`.

```ts
const a = makePoint(1, 2);
const b = makePoint(1, 2);
expect(a).not.toBe(b);   // different objects, different references
expect(a).toEqual(b);    // same contents, deep equality passes
```

The rule of thumb: use `toBe` for primitives (numbers, strings, booleans) and for checking that two variables point at the literal same object. Use `toEqual` for comparing the contents of objects and arrays.

### describe() and setup/teardown hooks

`describe(name, fn)` groups related tests together, mostly for organizing test output and for scoping hooks to only the tests inside that block. Four hooks control setup and teardown around those tests:

- `beforeAll` runs once, before any test in the block.
- `beforeEach` runs before every single test in the block.
- `afterEach` runs after every single test in the block.
- `afterAll` runs once, after every test in the block has finished.

The order these actually run in, for a block with two tests, is: `beforeAll`, then for each test: `beforeEach`, the test itself, `afterEach`, and finally `afterAll` once at the very end. This matters in practice because `beforeEach` is the standard place to reset any shared state (like a counter, or a fresh instance of something being tested) so that one test's leftover state can never leak into the next test.

### jest.fn(): mock functions

`jest.fn()` creates a fake function. It can be passed anywhere a real function is expected, and Jest records every call made to it, including the arguments. This makes it possible to test that some code called a callback the right number of times, with the right arguments, without needing a real implementation behind that callback.

```ts
const mockCallback = jest.fn();
notifyAll(mockCallback, ["hello", "world"]);

expect(mockCallback).toHaveBeenCalledTimes(2);
expect(mockCallback).toHaveBeenNthCalledWith(1, "hello");
expect(mockCallback).toHaveBeenNthCalledWith(2, "world");
```

A mock function can also be told what to return, using `.mockReturnValue(value)`, which is useful for standing in for something like a data-fetching function during a test.

### Testing asynchronous code

An async test function can simply `await` a promise and make assertions afterward, exactly like ordinary `async`/`await` code anywhere else:

```ts
test("async/await works directly in a test", async () => {
  const greeting = await fetchGreeting("Ada");
  expect(greeting).toBe("Hello, Ada!");
});
```

Jest also provides `.resolves` and `.rejects`, which unwrap a promise directly inside the `expect` call, still requiring `await` in front of the whole expression:

```ts
await expect(fetchGreeting("Grace")).resolves.toBe("Hello, Grace!");
await expect(fetchGreetingThatFails()).rejects.toThrow("network error");
```

Forgetting the `await` in any of these async forms is a common mistake: the test function returns before the promise settles, and Jest either reports a false pass or a confusing unrelated failure.

## Resources

- Jest documentation: <https://jestjs.io/docs/getting-started>
- Using matchers: <https://jestjs.io/docs/using-matchers>
- Setup and teardown: <https://jestjs.io/docs/setup-teardown>
- Mock functions: <https://jestjs.io/docs/mock-functions>
- Testing asynchronous code: <https://jestjs.io/docs/asynchronous>

## Practice

1. Write a `multiply(a, b)` function and a test for it using `toBe`.
2. Write two tests that build the same array of objects separately, and confirm `toBe` fails between them while `toEqual` passes.
3. Write a `describe` block with `beforeEach` resetting a shared array, and two tests that each push a different item onto it, confirming neither test sees the other's leftover item.
4. Write a function that takes a callback and calls it twice with different arguments, then use `jest.fn()` to confirm exactly how it was called.
5. Write an async function that rejects with a specific error message, and test it with both `try`/`catch` and `.rejects.toThrow()`.

## Code Example

See [01-jest-fundamentals.test.ts](./01-jest-fundamentals.test.ts).
