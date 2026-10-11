// Reassigning `exports` only rebinds the LOCAL variable inside this module's
// wrapper function. module.exports, the thing require() actually returns,
// still points at the original empty object Node created before this file ran.
exports = {
  greet: () => "hello from broken",
};
