import express from "express";
import {
  createStaff,
  listUsers,
  deleteUser,
  getDashboardStats,
} from "../controllers/adminController.js";
import { User } from "../models/index.js";
import { authenticateJWT } from "../middleware/jwtAuthMiddleware.js";
import { authorizeRole } from "../middleware/roleMiddleware.js";

const adminRoutes = express.Router();

// Apply middleware for all admin routes
adminRoutes.use(authenticateJWT, authorizeRole("admin"));

// ================== Dashboard ==================
adminRoutes.get("/dashboard", async (req, res) => {
  try {
    const stats = await getDashboardStats();

    res.render("admin/dashboard", {
      user: req.user,
      stats,
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).send("Failed to load dashboard");
  }
});

// ================== Manage Users (EJS) ==================
adminRoutes.get("/users", async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ["id", "email", "role", "created_at"],
      order: [["created_at", "DESC"]],
    });

    res.render("admin/manage-users-admin", { users, user: req.user });
  } catch (err) {
    console.error("Error loading users:", err);
    res.status(500).send("Failed to load users");
  }
});

// ================== Create Staff (EJS Form + Success) ==================
// Render form
adminRoutes.get("/create-staff", (req, res) => {
  res.render("admin/create-staff-admin", { user: req.user });
});

// Handle form submission -> show success page
adminRoutes.post("/create-staff", async (req, res, next) => {
  try {
    await createStaff(req, res); // Runs controller logic
    // Instead of JSON, show success page
    res.render("admin/staff-success", { user: req.user });
  } catch (err) {
    next(err);
  }
});

// ================== Admin APIs ==================
adminRoutes.get("/users/api", listUsers); // pure JSON API
// Delete user (render success page instead of JSON)
adminRoutes.post("/users/:id/delete", async (req, res) => {
  try {
    await deleteUser(req, res); // call controller
    res.render("admin/delete-success", { user: req.user });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).send("Failed to delete user");
  }
});

// ================== Logout ==================
adminRoutes.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

export default adminRoutes;
