// backend/src/middleware/errorHandler.js
import { ValidationError, UniqueConstraintError } from "sequelize";
import jwt from "jsonwebtoken";

/**
 * Centralized Express error handler.
 *
 * Usage: app.use(errorHandler);
 *
 * The handler will:
 * - Detect API vs browser (based on URL path /api/ or Accept header).
 * - Normalize common error types (Sequelize, JWT, Axios).
 * - Log full error server-side; send safe messages to clients.
 */
export const errorHandler = (err, req, res, next) => {
  // Default values
  let statusCode = err.status || err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let details = null;

  // ----- Normalize some known libraries/errors -----
  // Sequelize validation errors
  if (err instanceof ValidationError) {
    statusCode = 400;
    message = "Validation error";
    details = err.errors.map((e) => ({
      field: e.path,
      message: e.message,
      value: e.value,
    }));
  }

  // Sequelize unique constraint
  if (err instanceof UniqueConstraintError) {
    statusCode = 409;
    message = "Duplicate entry";
    details = err.errors.map((e) => ({ field: e.path, message: e.message }));
  }

  // JWT errors
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  } else if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  // Axios HTTP errors (optional)
  if (err.isAxiosError && err.response) {
    statusCode = err.response.status || statusCode;
    message = err.response.data?.message || err.response.statusText || message;
    details = err.response.data || null;
  }

  // If error explicitly sets status < 400 treat as server error
  if (typeof statusCode !== "number" || statusCode < 400) {
    statusCode = 500;
  }

  // Log the error (server-side). Keep this as detailed as possible.
  // You can replace console with a structured logger (winston/pino) later.
  console.error(`[${new Date().toISOString()}] Error:`, {
    message: err.message,
    status: statusCode,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    user: req.user?.id ?? null,
    extra: err.extra ?? null,
  });

  // Prepare payload for API responses
  const payload = {
    status: "error",
    message,
  };

  if (details) payload.details = details;

  // In non-production, include stack trace for easier debugging
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) {
    payload.stack = err.stack;
  }

  // Decide response type: API vs HTML
  const wantsJson =
    req.originalUrl.startsWith("/api/") ||
    req.headers.accept?.includes("application/json");

  if (wantsJson) {
    return res.status(statusCode).json(payload);
  }

  // For HTML pages, try to render an error view if exists, otherwise send simple HTML
  // You can create views/errors/500.ejs for nicer UX.
  try {
    // try rendering a view (preferred)
    return res.status(statusCode).render("errors/500", {
      title: "Error",
      statusCode,
      message,
      stack: !isProd ? err.stack : null,
    });
  } catch (renderErr) {
    // fallback to JSON/plain text
    res.status(statusCode).send(`
      <h1>Something went wrong</h1>
      <p>${message}</p>
      ${!isProd && `<pre>${err.stack}</pre>`}
    `);
  }
};
