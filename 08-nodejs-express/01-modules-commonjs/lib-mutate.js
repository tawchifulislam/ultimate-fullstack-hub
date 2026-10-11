// Mutating a property ON exports, instead of reassigning exports itself,
// works: exports and module.exports start out pointing at the same object,
// so a mutation here is visible through module.exports too.
exports.greet = () => "hello from mutate";
