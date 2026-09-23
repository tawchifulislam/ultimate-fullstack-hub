function delay(ms, value) {
  return new Promise(resolve => setTimeout(() => resolve(value), ms));
}

// Demo 1: an async function always returns a Promise
async function getValue() {
  return 42;
}
console.log('getValue() itself:', getValue());
getValue().then(v => console.log('getValue() resolves to:', v));

// Demo 2: try/catch actually catches an async rejection
async function mightFail(shouldFail) {
  if (shouldFail) throw new Error('it failed inside an async function');
  return 'success';
}

async function tryCatchDemo() {
  try {
    const result = await mightFail(true);
    console.log('this never runs:', result);
  } catch (err) {
    console.log('\n[try/catch] caught it for real:', err.message);
  }
}

// Demo 3: sequential awaits vs Promise.all, timed
async function sequentialDemo() {
  const start = Date.now();
  await delay(100);
  await delay(100);
  await delay(100);
  console.log(
    '\n[sequential] three 100ms awaits took:',
    Date.now() - start,
    'ms',
  );
}

async function parallelDemo() {
  const start = Date.now();
  await Promise.all([delay(100), delay(100), delay(100)]);
  console.log(
    '[parallel] three 100ms delays via Promise.all took:',
    Date.now() - start,
    'ms',
  );
}

// Demo 4: for...of (sequential) vs forEach (does not wait at all)
async function forOfDemo() {
  console.log('\n[for...of] sequential, waits for each iteration:');
  for (const n of [1, 2, 3]) {
    await delay(20);
    console.log('  processed', n);
  }
  console.log('[for...of] loop fully finished before this line runs');
}

async function forEachMistakeDemo() {
  console.log('\n[forEach] does NOT wait between iterations:');
  [1, 2, 3].forEach(async n => {
    await delay(20);
    console.log(
      '  processed',
      n,
      '(these will NOT be in order, and may print late)',
    );
  });
  console.log(
    '[forEach] this logs immediately, before any iteration has finished',
  );
}

// Run everything in order so the output is easy to follow
(async () => {
  await tryCatchDemo();
  await sequentialDemo();
  await parallelDemo();
  await forOfDemo();
  await forEachMistakeDemo();
})();
