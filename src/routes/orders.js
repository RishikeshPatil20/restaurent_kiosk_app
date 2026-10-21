import express from "express";
import {
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  getOrderById,
} from "../controllers/ordersController.js";
import { authenticateJWT } from "../middleware/jwtAuthMiddleware.js";
import { authorizeRole } from "../middleware/roleMiddleware.js";

const ordersRoutes = express.Router();

// Kiosk routes
ordersRoutes.post("/", authenticateJWT, authorizeRole(["kiosk"]), createOrder);
ordersRoutes.get("/my", authenticateJWT, authorizeRole(["kiosk"]), getMyOrders);

// Staff/Admin routes
ordersRoutes.get("/", authenticateJWT, authorizeRole(["staff", "admin"]), getAllOrders);
ordersRoutes.patch("/:id/status", authenticateJWT, authorizeRole(["staff", "admin"]), updateOrderStatus);

// Shared (kiosk can see own, staff/admin can see any)
ordersRoutes.get("/:id", authenticateJWT, getOrderById);

export default ordersRoutes;
