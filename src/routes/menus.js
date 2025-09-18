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

// ================= Public Routes =================
menusRoutes.get("/", getMenus);
menusRoutes.get("/:id", getMenuById);

// ================= Admin Routes =================
menusRoutes.post("/", authenticateJWT, authorizeRole(["admin"]), createMenu);
menusRoutes.put("/:id", authenticateJWT, authorizeRole(["admin"]), updateMenu);
menusRoutes.delete(
  "/:id",
  authenticateJWT,
  authorizeRole(["admin"]),
  deleteMenu
);
menusRoutes.get(
  "/admin/all",
  authenticateJWT,
  authorizeRole(["admin"]),
  getAllMenusAdmin
);

// ================= Admin or Staff Routes =================
menusRoutes.patch(
  "/:id/availability",
  authenticateJWT,
  authorizeRole(["admin", "staff"]),
  toggleAvailability
);

export default menusRoutes;
