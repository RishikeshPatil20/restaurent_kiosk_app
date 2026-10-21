// middleware/roleMiddleware.js
import { wantsJson } from "../utils/request.js";

export const authorizeRole = (roles = []) => {
  if (typeof roles === "string") {
    roles = [roles]; // allow passing a single role
  }

  return (req, res, next) => {
    if (!req.user) {
      // not logged in
      if (wantsJson(req)) return res.status(401).json({ message: "Authentication required" });
      return res.redirect("/login");
    }

    if (!roles.includes(req.user.role)) {
      // logged in but not enough permission
      if (wantsJson(req)) {
        return res.status(403).json({ message: "You don’t have permission to do this." });
      }
      return res.status(403).render("errors/403", {
        title: "Access Denied",
        message: "You don’t have permission to view this page.",
        url: req.originalUrl,
      });
    }

    next();
  };
};
