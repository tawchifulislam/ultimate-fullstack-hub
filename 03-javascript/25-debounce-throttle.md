# Debounce & Throttle

**Topic 37 of 89** (Section: JavaScript, 25 of 26)

## Notes

### The problem both solve

Some events can fire dozens or hundreds of times per second: typing, scrolling, resizing, dragging. Running an expensive handler (an API call, a layout recalculation) on every single one of those firings wastes work and can visibly slow a page down. Debounce and throttle are two different, closure-based ways of controlling that rate, and they are not interchangeable, each fits a different situation.

### Debounce: wait for a pause

Debounce delays running a function until a specified time has passed since the *last* call. Every new call resets the timer, so the function only actually runs once the calls stop for that whole delay period.

```js
function debounce(fn, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}
```

Good fits: search-as-you-type (wait until the user actually stops typing before calling the API), window resize (wait until resizing stops before recalculating an expensive layout), form validation on input.

### Throttle: cap the rate

Throttle guarantees a function runs at most once every fixed interval, no matter how many times it's called during that interval, and unlike debounce, it keeps firing periodically for as long as calls keep coming.

```js
function throttle(fn, interval) {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= interval) {
      lastCall = now;
      fn.apply(this, args);
    }
  };
}
```

Good fits: tracking scroll position, mousemove-based dragging, an infinite-scroll "near the bottom" check, these all need regular updates *during* continuous activity, which debounce would never provide since it only fires after activity stops.

### Debounce vs throttle, the actual distinction

Debounce answers "what's the final state, once things settle down." Throttle answers "give me steady updates the whole time this is happening." Throttling a search input, for example, would fire the API repeatedly *while* the user is still typing, which is almost never what's wanted, that's a job for debounce instead.

### Leading vs trailing edge

"Leading edge" means running on the very first call of a burst, immediately. "Trailing edge" means running once more after the burst goes quiet, using the most recent arguments. The hand-rolled debounce above is trailing-only, and the hand-rolled throttle above is leading-only. Lodash's real implementations default to `_.debounce(fn, wait)` as `{ leading: false, trailing: true }` and `_.throttle(fn, wait)` as `{ leading: true, trailing: true }`, which is exactly why debounce "feels like" it only fires at the very end, while throttle "feels like" it fires immediately and then periodically.

### Common bugs in a hand-rolled version

- Forgetting to clear the previous timer in debounce, this causes it to fire multiple times instead of collapsing into one.
- Not forwarding `this` and the arguments correctly (`fn.apply(this, args)`), which matters whenever the wrapped function is meant to be called as an object method.
- An off-by-one in the throttle's time comparison, using `>` instead of `>=`, or forgetting to actually update `lastCall`, silently breaks the rate limit.

### Practical tips

- In real projects, reach for a well-tested implementation (lodash's `_.debounce`/`_.throttle`) rather than hand-rolling one; the leading/trailing edge cases, plus `.cancel()` and `.flush()` methods, are easy to get subtly wrong.
- Picking the wrong one is the most common mistake: debounce for "wait until they're done," throttle for "cap the rate while it's ongoing."
- Both rely entirely on a closure (an earlier topic) to remember a timer id or a last-call timestamp between separate invocations of the wrapped function.

## Resources

- CSS-Tricks, Debouncing and Throttling Explained Through Examples: <https://css-tricks.com/debouncing-throttling-explained-examples/>
- Lodash docs, debounce: <https://lodash.com/docs/4.17.15#debounce>
- Lodash docs, throttle: <https://lodash.com/docs/4.17.15#throttle>

## Practice / Exercises

- Call a debounced function five times in quick succession, then predict how many times, and with which call's arguments, the underlying function actually runs before checking.
- Build a throttled function with a visible counter, call it 20 times over one second, and confirm the counter increases roughly once per interval instead of 20 times.

## Code Example

See [`25-debounce-throttle.js`](./25-debounce-throttle.js) in this folder.
