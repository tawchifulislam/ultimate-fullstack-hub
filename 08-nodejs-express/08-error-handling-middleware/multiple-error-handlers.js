// multiple-error-handlers.js
// There can be more than one error-handling middleware. Calling next(err)
// FROM INSIDE an error handler passes the same error on to the next one,
// exactly like next() does for normal middleware. A common real use: one
// handler that only logs/reports the error (to a file, a monitoring
// service), then hands it off to a second one that actually responds.

const express = require("express");
const app = express();
const port = process.argv[2] || 4403;

app.get("/fail", (req, res) => {
  throw new Error("deliberate failure for this demo");
});

// First error handler: logging only, does not send a response itself.
app.use((err, req, res, next) => {
  console.log(`[error-logger] would report to a monitoring service: ${err.message}`);
  next(err); // pass the SAME error along to the next error handler
});

// Second error handler: decorates the error with a tracking id.
app.use((err, req, res, next) => {
  err.trackingId = "trk_" + Math.random().toString(36).slice(2, 8);
  console.log(`[error-tracker] assigned ${err.trackingId}`);
  next(err);
});

// Third and final error handler: the one that actually responds.
app.use((err, req, res, next) => {
  console.log(`[error-responder] sending response for ${err.trackingId}`);
  res.status(500).json({ error: err.message, trackingId: err.trackingId });
});

app.listen(port, () => console.log(`multiple-error-handlers listening on ${port}`));
