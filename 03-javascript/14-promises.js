// Demo 1: basic promise, then/catch/finally
function delay(ms, value) {
  return new Promise(resolve => setTimeout(() => resolve(value), ms));
}

delay(10, 'done')
  .then(value => console.log('[basic] fulfilled with:', value))
  .catch(err => console.log('[basic] rejected with:', err))
  .finally(() => console.log('[basic] finally always runs'));

// Demo 2: chaining, rewriting the callback-hell example as a flat chain
function getUser(id) {
  return delay(10, { id, name: 'Ada' });
}
function getOrders(userId) {
  return delay(10, [{ id: 101, total: 42 }]);
}
function getOrderDetails(orderId) {
  return delay(10, { id: orderId, item: 'Keyboard' });
}

getUser(1)
  .then(user => {
    console.log('\n[chain] got user:', user.name);
    return getOrders(user.id);
  })
  .then(orders => {
    console.log('[chain] got orders:', orders.length);
    return getOrderDetails(orders[0].id);
  })
  .then(details => {
    console.log('[chain] got order details:', details.item);
  })
  .catch(err => console.log('[chain] something failed:', err));

// Demo 3: an error thrown inside .then() propagates down to .catch()
Promise.resolve(5)
  .then(n => {
    if (n > 0) throw new Error('thrown inside a .then()');
    return n;
  })
  .then(n => {
    console.log('this .then() is skipped entirely'); // never runs
  })
  .catch(err =>
    console.log('\n[propagation] caught further down the chain:', err.message),
  );

// Demo 4: the four combinators, each shown with its own fresh set of
// promises so a rejection is always attached to a handler right away.
function makeFailing(ms, message) {
  const p = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(message)), ms),
  );
  return p;
}

(async () => {
  await delay(250); // let the earlier demos finish logging first
  console.log('\n[combinators]');

  try {
    await Promise.all([
      delay(10, 'fast'),
      delay(50, 'slow'),
      makeFailing(20, 'it failed'),
    ]);
  } catch (err) {
    console.log('Promise.all rejected with the first failure:', err.message);
  }

  const settled = await Promise.allSettled([
    delay(10, 'fast'),
    delay(50, 'slow'),
    makeFailing(20, 'it failed'),
  ]);
  console.log(
    'Promise.allSettled statuses:',
    settled.map(r => r.status),
  );

  const winner = await Promise.race([
    delay(10, 'fast'),
    delay(50, 'slow'),
    makeFailing(20, 'it failed'),
  ]);
  console.log('Promise.race settled with the fastest one:', winner);

  try {
    await Promise.any([
      makeFailing(10, 'a failed'),
      makeFailing(20, 'b failed'),
    ]);
  } catch (err) {
    console.log(
      'Promise.any rejects only if ALL reject:',
      err.constructor.name,
    );
  }

  const anyResult = await Promise.any([
    delay(10, 'fast'),
    makeFailing(20, 'c failed'),
  ]);
  console.log('Promise.any resolves with the first success:', anyResult);
})();
