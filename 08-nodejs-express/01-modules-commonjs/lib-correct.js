// The reliable way: assign module.exports directly. This is what require()
// actually returns, regardless of what the local `exports` variable does.
module.exports = {
  greet: () => "hello from correct",
};
