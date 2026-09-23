// Demo 1: synchronous code always runs before an async callback, even at 0ms
console.log('1: start');
setTimeout(() => console.log('3: timeout callback'), 0);
console.log('2: end');

// Demo 2: error-first callback pattern, simulating an async file read
function fakeReadFile(path, callback) {
  setTimeout(() => {
    if (path === 'missing.txt') {
      callback(new Error('File not found'), null);
    } else {
      callback(null, 'fake file contents');
    }
  }, 10);
}

fakeReadFile('notes.txt', (err, data) => {
  if (err) {
    console.log('\n[error-first] failed:', err.message);
    return;
  }
  console.log('\n[error-first] success:', data);
});

fakeReadFile('missing.txt', (err, data) => {
  if (err) {
    console.log('[error-first] failed:', err.message);
    return;
  }
  console.log('[error-first] success:', data);
});

// Demo 3: try/catch cannot catch an error thrown inside an async callback
process.once('uncaughtException', err => {
  console.log(
    '\n[try/catch demo] the throw escaped as an uncaughtException instead:',
    err.message,
  );
});

try {
  setTimeout(() => {
    throw new Error('boom, thrown asynchronously');
  }, 20);
  console.log(
    '\n[try/catch demo] try block finished normally, before the timer even fired',
  );
} catch (err) {
  // this line never runs, proving the point
  console.log(
    '[try/catch demo] caught synchronously (this should never print)',
  );
}

// Demo 4: callback hell, three dependent async steps nested three levels deep
function getUser(id, callback) {
  setTimeout(() => callback(null, { id, name: 'Ada' }), 30);
}
function getOrders(userId, callback) {
  setTimeout(() => callback(null, [{ id: 101, total: 42 }]), 30);
}
function getOrderDetails(orderId, callback) {
  setTimeout(() => callback(null, { id: orderId, item: 'Keyboard' }), 30);
}

getUser(1, (err, user) => {
  if (err) return console.log(err);
  console.log('\n[callback hell] got user:', user.name);
  getOrders(user.id, (err, orders) => {
    if (err) return console.log(err);
    console.log('[callback hell] got orders:', orders.length);
    getOrderDetails(orders[0].id, (err, details) => {
      if (err) return console.log(err);
      console.log('[callback hell] got order details:', details.item);
      console.log(
        '[callback hell] this nesting is exactly what Promises fix next',
      );
    });
  });
});
