// backend/src/middleware/errorHandler.js
import { ValidationError, UniqueConstraintError } from "sequelize";
import { wantsJson } from "../utils/request.js";

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

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
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  // Default values
  let statusCode = err.status || err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let details = null;

  // ----- Normalize some known libraries/errors -----
  // Sequelize unique constraint (subclass of ValidationError, so check it first)
  if (err instanceof UniqueConstraintError) {
    statusCode = 409;
    message = "Duplicate entry";
    details = err.errors.map((e) => ({ field: e.path, message: e.message }));
  } else if (err instanceof ValidationError) {
    // Sequelize validation errors
    statusCode = 400;
    message = "Validation error";
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

  // If error explicitly sets status < 400 treat as server error
  if (typeof statusCode !== "number" || statusCode < 400) {
    statusCode = 500;
  }

  const isProd = process.env.NODE_ENV === "production";

  // Never leak internal error messages (SQL, file paths) for 5xx responses
  if (statusCode >= 500) {
    message = "Internal Server Error";
  }

  // Log the error (server-side). Keep this as detailed as possible.
  console.error(`[${new Date().toISOString()}] Error:`, {
    message: err.message,
    status: statusCode,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    user: req.user?.id ?? null,
  });

  if (res.headersSent) return;

  if (wantsJson(req)) {
    const payload = { status: "error", message };
    if (details) payload.details = details;
    if (!isProd) payload.stack = err.stack;
    return res.status(statusCode).json(payload);
  }

  const stack = !isProd ? err.stack : null;
  res.status(statusCode).render(
    "errors/500",
    { title: "Error", statusCode, message, url: req.originalUrl, stack },
    (renderErr, html) => {
      if (!renderErr) return res.send(html);
      console.error("Error page failed to render:", renderErr);
      res.send(`
        <h1>Something went wrong</h1>
        <p>${escapeHtml(message)}</p>
        ${stack ? `<pre>${escapeHtml(stack)}</pre>` : ""}
      `);
    }
  );
};
