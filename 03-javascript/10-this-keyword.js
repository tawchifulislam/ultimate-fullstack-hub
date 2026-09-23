'use strict';

// Demo 1: the four call forms, and what `this` is in each
function whoIsThis() {
  return this;
}

console.log('plain call (strict mode):', whoIsThis()); // undefined

const obj = {
  name: 'Widget',
  whoIsThis() {
    return this;
  },
};
console.log('method call, obj.whoIsThis():', obj.whoIsThis() === obj);

function Thing() {
  this.created = true;
  return this;
}
const instance = new Thing();
console.log('new Thing(), this === instance:', instance.created === true);

const explicitTarget = { label: 'explicit target' };
console.log(
  'whoIsThis.call(explicitTarget):',
  whoIsThis.call(explicitTarget) === explicitTarget,
);

// Demo 2: the classic "losing this" bug, and three fixes
const widget = {
  name: 'Button',
  greet() {
    return `Hi, I'm ${this.name}`;
  },
};

const detachedGreet = widget.greet;
try {
  console.log('\ndetached call result:', detachedGreet()); // this.name throws in strict mode
} catch (err) {
  console.log('\ndetached call threw:', err.constructor.name);
}

// Fix 1: .bind()
const boundGreet = widget.greet.bind(widget);
console.log('fixed with .bind():', boundGreet());

// Fix 2: arrow function wrapper at the call site
function callLater(fn) {
  return fn();
}
console.log(
  'fixed with arrow wrapper:',
  callLater(() => widget.greet()),
);

// Fix 3: class field arrow function, bound per instance automatically
class WidgetClass {
  name = 'ClassWidget';
  greet = () => `Hi, I'm ${this.name}`;
}
const widgetInstance = new WidgetClass();
const detachedClassGreet = widgetInstance.greet;
console.log(
  'class field arrow, detached call still works:',
  detachedClassGreet(),
);

// Demo 3: new outranks even an explicit bind()
function Point(x) {
  this.x = x;
}
const boundTarget = {};
const BoundPoint = Point.bind(boundTarget);

BoundPoint(5); // plain call, uses the bound target
console.log('\nplain call through bind, boundTarget.x:', boundTarget.x);

const p = new BoundPoint(99); // new still wins, creates its own object
console.log('new through a bound function, p.x:', p.x);
console.log('boundTarget.x unchanged by the new call:', boundTarget.x);
