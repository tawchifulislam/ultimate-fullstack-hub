// At the top level (not inside any I/O callback), setTimeout(fn, 0) and
// setImmediate() race: which one fires first depends on how long it takes
// the process to get from startup into the event loop's timers phase,
// which can vary run to run. Run this file several times and watch the
// order flip.
setTimeout(() => console.log("timeout"), 0);
setImmediate(() => console.log("immediate"));
