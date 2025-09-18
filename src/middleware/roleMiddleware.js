// middleware/roleMiddleware.js
export const authorizeRole = (roles = []) => {
  if (typeof roles === "string") {
    roles = [roles]; // allow passing a single role
  }

  return (req, res, next) => {
    if (!req.user) {
      // not logged in
      return res.status(401).redirect("/login");
    }

    if (!roles.includes(req.user.role)) {
      // logged in but not enough permission
      return res.status(403).render("errors/403", { 
        title: "Access Denied", 
        message: "You don’t have permission to view this page." 
      });
    }

    next();
  };
};
