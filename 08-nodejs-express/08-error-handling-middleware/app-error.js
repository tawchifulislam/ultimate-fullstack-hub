// app-error.js
// A custom error class distinguishes "operational" errors, ones we
// expected could happen and have a clear HTTP meaning for (bad input,
// missing resource) from genuine bugs (a programmer error: a typo, a
// null reference). The centralized handler in central-error-handler.js
// treats these two categories very differently.

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // marks this as an expected, "safe to show" error
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
