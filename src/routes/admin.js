import express from "express";
import {
  createStaff,
  listUsers,
  deleteUser,
  renderUsers,
  renderCreateStaff,
} from "../controllers/adminController.js";
import { authenticateJWT } from "../middleware/jwtAuthMiddleware.js";
import { authorizeRole } from "../middleware/roleMiddleware.js";

const adminRoutes = express.Router();

// Apply middleware for all admin routes
adminRoutes.use(authenticateJWT, authorizeRole("admin"));

// ================== Dashboard ==================
// The dashboard lives at /admin; keep the old URL working
adminRoutes.get("/dashboard", (req, res) => res.redirect("/admin"));

// ================== Manage Users (EJS) ==================
adminRoutes.get("/users", renderUsers);
adminRoutes.post("/users/:id/delete", deleteUser);

// ================== Create Staff (EJS Form + Success) ==================
adminRoutes.get("/create-staff", renderCreateStaff);
adminRoutes.post("/create-staff", createStaff);

// ================== Admin APIs ==================
adminRoutes.get("/users/api", listUsers); // pure JSON API

export default adminRoutes;
