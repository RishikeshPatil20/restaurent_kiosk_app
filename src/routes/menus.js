import express from "express";
import {
  getMenus,
  getMenuById,
  createMenu,
  updateMenu,
  deleteMenu,
  getAllMenusAdmin,
  toggleAvailability,
} from "../controllers/menusController.js";
import { authenticateJWT } from "../middleware/jwtAuthMiddleware.js";
import { authorizeRole } from "../middleware/roleMiddleware.js";

const menusRoutes = express.Router();

// ================= Admin Routes =================
// Must be registered before "/:id", otherwise "admin" is treated as a menu id
menusRoutes.get(
  "/admin/all",
  authenticateJWT,
  authorizeRole(["admin"]),
  getAllMenusAdmin
);
menusRoutes.post("/", authenticateJWT, authorizeRole(["admin"]), createMenu);
menusRoutes.put("/:id", authenticateJWT, authorizeRole(["admin"]), updateMenu);
menusRoutes.delete(
  "/:id",
  authenticateJWT,
  authorizeRole(["admin"]),
  deleteMenu
);

// ================= Public Routes =================
menusRoutes.get("/", getMenus);
menusRoutes.get("/:id", getMenuById);

// ================= Admin or Staff Routes =================
menusRoutes.patch(
  "/:id/availability",
  authenticateJWT,
  authorizeRole(["admin", "staff"]),
  toggleAvailability
);

export default menusRoutes;
