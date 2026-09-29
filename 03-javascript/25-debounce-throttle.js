function debounce(fn, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

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

// Demo 1: debounce collapses a rapid burst into exactly ONE call,
// using the arguments from the LAST call in the burst.
let debounceCallCount = 0;
const debouncedSave = debounce(value => {
  debounceCallCount++;
  console.log(
    `[debounce] actually ran, call #${debounceCallCount}, value: "${value}"`,
  );
}, 200);

console.log(
  '[debounce] simulating 5 rapid calls, 50ms apart, with a 200ms debounce delay:',
);
for (let i = 1; i <= 5; i++) {
  setTimeout(() => {
    console.log(`[debounce] input call ${i}`);
    debouncedSave(`state after call ${i}`);
  }, i * 50);
}

// Demo 2: throttle caps the rate, running periodically WHILE calls keep coming.
let throttleCallCount = 0;
const throttledScroll = throttle(() => {
  throttleCallCount++;
  console.log(
    `[throttle] actually ran, call #${throttleCallCount}, at ${Date.now() % 100000}ms`,
  );
}, 200);

setTimeout(() => {
  console.log(
    '\n[throttle] simulating 20 rapid calls, 50ms apart, with a 200ms throttle interval:',
  );
  for (let i = 1; i <= 20; i++) {
    setTimeout(() => throttledScroll(), i * 50);
  }
}, 400); // start after demo 1 has settled

// Demo 3: summarize the final counts once everything has finished
setTimeout(() => {
  console.log(
    `\n[summary] debounce actually ran ${debounceCallCount} time(s) out of 5 input calls`,
  );
  console.log(
    `[summary] throttle actually ran ${throttleCallCount} time(s) out of 20 input calls`,
  );
}, 1600);
