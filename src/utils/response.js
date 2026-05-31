const { appLogger } = require("./logger");

const DEFAULT_ERROR_MESSAGES = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  422: "Unprocessable Entity",
  429: "Too Many Requests",
  500: "Internal Server Error",
};

function sendResponse(res, statusCode = 200, payload = {}) {
  const response = {
    success: payload.success ?? statusCode < 400,
    message: payload.message || "",
    data: payload.data ?? null,
    errors: Array.isArray(payload.errors) ? payload.errors : [],
  };

  return res.status(statusCode).json(response);
}

function handleErrorMessage(res, error, statusCode = 500, options = {}) {
  const resolvedStatusCode = error?.status || error?.statusCode || statusCode;
  const message =
    error?.message ||
    DEFAULT_ERROR_MESSAGES[resolvedStatusCode] ||
    "Internal Server Error";
  const errors = Array.isArray(options.errors)
    ? options.errors
    : Array.isArray(error?.errors)
      ? error.errors
      : [];

  if (options.log !== false) {
    appLogger.error(error instanceof Error ? error : new Error(message), {
      statusCode: resolvedStatusCode,
      ...options.meta,
    });
  }

  return sendResponse(res, resolvedStatusCode, {
    success: false,
    message,
    data: null,
    errors,
  });
}

module.exports = {
  sendResponse,
  handleErrorMessage,
};
