// Demo 1: the classic ordering example
console.log('1: sync');
setTimeout(() => console.log('4: macrotask'), 0);
Promise.resolve().then(() => console.log('3: microtask'));
console.log('2: sync');

// Demo 2: a microtask that schedules another microtask still beats
// a macrotask that was scheduled earlier
setTimeout(() => console.log('\n[demo2] E: macrotask'), 0);
Promise.resolve()
  .then(() => {
    console.log('[demo2] C: first microtask');
    return Promise.resolve();
  })
  .then(() =>
    console.log('[demo2] D: second microtask, queued from inside the first'),
  );
console.log('[demo2] A: sync');
queueMicrotask(() =>
  console.log('[demo2] B: queueMicrotask, still before the macrotask'),
);

// Demo 3: call stack overflow, caught safely
function recurseForever(n) {
  return recurseForever(n + 1);
}
try {
  recurseForever(0);
} catch (err) {
  console.log(
    '\n[demo3] deep recursion with no base case threw:',
    err.constructor.name,
  );
}

// Demo 4: two setTimeouts, with microtasks interleaved, all logged
// together at the end so the full sequence is easy to read
setTimeout(() => console.log('\n[demo4] timeout 1'), 0);
setTimeout(() => console.log('[demo4] timeout 2'), 0);
Promise.resolve().then(() => console.log('[demo4] microtask 1'));
Promise.resolve().then(() => console.log('[demo4] microtask 2'));
console.log('[demo4] sync code runs before all of the above');
