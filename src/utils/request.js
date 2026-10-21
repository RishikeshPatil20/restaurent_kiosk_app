// backend/src/utils/request.js

// Browser navigations and form posts send "Accept: text/html"; fetch() calls send
// "*/*" (or application/json), so anything that isn't asking for HTML on /api gets JSON.
export const wantsJson = (req) => {
  const accept = req.get("accept") || "";
  if (req.xhr || accept.includes("application/json")) return true;
  return req.originalUrl.startsWith("/api/") && !accept.includes("text/html");
};

// Landing page for each role
export const homeFor = (role) => {
  if (role === "admin") return "/admin";
  if (role === "staff") return "/staff";
  if (role === "kiosk") return "/kiosk";
  return "/login";
};

// Route params / body ids must be positive integers
export const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const MIN_PASSWORD_LENGTH = 8;
