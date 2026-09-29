function demoConsoleMethods() {
  console.table([
    { name: 'Ada', role: 'Engineer' },
    { name: 'Grace', role: 'Admiral' },
  ]);

  console.group('Grouped logs');
  console.log('first detail');
  console.log('second detail');
  console.groupEnd();

  console.time('loop timing');
  let total = 0;
  for (let i = 0; i < 100000; i++) total += i;
  console.timeEnd('loop timing');
}

function processItems() {
  const items = ['a', 'b', 'c', 'd', 'e', 'f'];
  for (let i = 0; i < items.length; i++) {
    // Set your conditional breakpoint on this line: i === 3
    console.log('processing', i, items[i]);
  }
}

function calculateDiscount(price, percentOff) {
  // Bug: this divides by 100 twice, once here and again below.
  const discount = (price * percentOff) / 100;
  const finalPrice = price - discount / 100; // <- the extra /100 is the bug
  return finalPrice;
  // Fix: remove the second "/ 100" on the finalPrice line.
}

function runBuggyDiscount() {
  const result = calculateDiscount(100, 20); // expect 80, watch what you actually get
  console.log('calculateDiscount(100, 20) returned:', result);
}

function pauseHere() {
  console.log('about to pause');
  debugger;
  console.log('resumed after clicking play in DevTools');
}
