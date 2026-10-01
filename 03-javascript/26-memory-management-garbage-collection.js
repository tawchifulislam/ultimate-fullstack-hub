// Run with: node --expose-gc 26-memory-management-garbage-collection.js
// The --expose-gc flag exposes global.gc(), letting this demo force a
// collection on demand so the before/after numbers are meaningful instead
// of depending on whenever V8 happens to decide to collect on its own.

if (typeof global.gc !== 'function') {
  console.log(
    'Run this file with: node --expose-gc 26-memory-management-garbage-collection.js',
  );
  process.exit(1);
}

function heapMB() {
  return (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1) + ' MB';
}

// Demo 1: mark-and-sweep correctly collects circular references
function demoCircularReferences() {
  console.log('=== Demo 1: circular references still get collected ===');
  global.gc();
  console.log('baseline heap:', heapMB());

  let pairs = [];
  for (let i = 0; i < 300000; i++) {
    const a = { data: new Array(50).fill(i) };
    const b = { data: new Array(50).fill(i) };
    a.other = b; // a references b
    b.other = a; // b references a right back, a circular reference
    pairs.push(a); // only "a" is reachable from here; "b" is only reachable through a.other
  }
  // Reading pairs.length here matters: it keeps the array a live reference up
  // to this point, so the gc() call below measures the real retained size
  // instead of memory V8 already decided pairs couldn't be read again.
  console.log('created', pairs.length, 'circularly-linked pairs');
  global.gc();
  console.log('heap while pairs is still holding them:', heapMB());

  pairs = []; // drop the only external reference into this whole web of pairs
  global.gc();
  console.log('heap after dropping that reference + gc:', heapMB());
  console.log(
    '(both halves of every circular pair were collected, despite referencing each other)\n',
  );
}

// Demo 2: WeakMap lets its keys be collected once nothing else references them
function demoWeakMap() {
  console.log(
    '=== Demo 2: WeakMap allows its keys to be garbage collected ===',
  );
  global.gc();
  console.log('baseline heap:', heapMB());

  let objects = [];
  const weak = new WeakMap();
  for (let i = 0; i < 300000; i++) {
    const obj = { data: new Array(50).fill(i) };
    weak.set(obj, i);
    objects.push(obj); // this array is the only OTHER reference to these objects
  }
  console.log('created', objects.length, 'objects, keyed in a WeakMap');
  global.gc();
  console.log('heap while objects[] still holds them:', heapMB());

  objects = []; // drop the only external references
  global.gc();
  console.log(
    'heap after dropping refs + gc (WeakMap did not keep them alive):',
    heapMB(),
  );
  console.log(
    '(the WeakMap itself has no .size to check, this is by design)\n',
  );
}

// Demo 3: a regular Map, by contrast, keeps its keys alive forever
function demoRegularMap() {
  console.log(
    '=== Demo 3: a regular Map prevents its keys from being collected ===',
  );
  global.gc();
  console.log('baseline heap:', heapMB());

  let objects = [];
  const strongMap = new Map();
  for (let i = 0; i < 300000; i++) {
    const obj = { data: new Array(50).fill(i) };
    strongMap.set(obj, i);
    objects.push(obj);
  }
  console.log('created', objects.length, 'objects, keyed in a Map');
  global.gc();
  console.log('heap while objects[] still holds them:', heapMB());

  objects = []; // drop the array's references; the Map itself still references every key
  global.gc();
  console.log(
    'heap after dropping refs + gc (Map still holds every key):',
    heapMB(),
  );
  console.log('strongMap.size (still holding everything):', strongMap.size);
}

demoCircularReferences();
demoWeakMap();
demoRegularMap();
