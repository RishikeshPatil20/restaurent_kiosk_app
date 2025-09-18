import express from "express";
import { getMenusForEjs } from "../controllers/menusController.js";
import { authenticateJWT } from "../middleware/jwtAuthMiddleware.js";
import { authorizeRole } from "../middleware/roleMiddleware.js";
import { User, Order, OrderItem, OrderEvent } from "../models/index.js";

const viewsRoutes = express.Router();

// Public login page
viewsRoutes.get("/login", (req, res) => {
  return res.render("auth/login");
});

// Kiosk dashboard (requires kiosk-user, staff, or admin)
viewsRoutes.get(
  "/kiosk",
  authenticateJWT,
  authorizeRole(["kiosk", "staff", "admin"]),
  async (req, res) => {
    try {
      const menus = await getMenusForEjs();
      return res.render("kiosk/index", { menus, user: req.user });
    } catch (err) {
      console.error("Error loading kiosk page:", err);
      return res.status(500).send("Failed to load kiosk page");
    }
  }
);

// Kitchen staff dashboard
viewsRoutes.get(
  "/staff",
  authenticateJWT,
  authorizeRole(["staff", "admin"]),
  async (req, res) => {
    try {
      const orders = await Order.findAll({
        include: [{ model: OrderItem, as: "items" }],
        order: [["created_at", "DESC"]],
      });

      return res.render("kitchen/dashboard", {
        user: req.user,
        orders,
      });
    } catch (err) {
      console.error("Error loading staff dashboard:", err);
      return res.status(500).send("Failed to load staff dashboard");
    }
  }
);

// Admin dashboard (admin only)
viewsRoutes.get(
  "/admin",
  authenticateJWT,
  authorizeRole(["admin"]),
  async (req, res) => {
    try {
      // ✅ Total counts
      const totalUsers = await User.count();
      const totalOrders = await Order.count();

      // ✅ Active staff (role = staff, maybe later add "online" field if you track)
      const activeStaff = await User.count({ where: { role: "staff" } });

      // ✅ Pending orders
      const pendingOrders = await Order.count({ where: { status: "pending" } });

      // ✅ Recent activity (last 5 order events)
      const recentEvents = await OrderEvent.findAll({
        limit: 5,
        order: [["created_at", "DESC"]],
      });

      const recentActivity = recentEvents.map((event) => {
        return `Order #${event.order_id} → ${event.event_type}`;
      });

      const stats = {
        totalUsers,
        totalOrders,
        activeStaff,
        pendingOrders,
        recentActivity,
      };

      res.render("admin/dashboard", { user: req.user, stats });
    } catch (err) {
      console.error("Error loading admin dashboard:", err);
      res.status(500).render("errors/500", {
        statusCode: 500,
        message: "Failed to load admin dashboard",
        stack: process.env.NODE_ENV === "development" ? err.stack : null,
      });
    }
  }
);

// API-style menu filter (could also be protected if you want)
viewsRoutes.get("/menus/:category", async (req, res) => {
  const category = req.params.category;
  const menus = await getMenusForEjs();
  const filtered = menus.filter((m) => m.item_category === category);

  res.json(filtered);
});

// Default root: redirect to login
viewsRoutes.get("/", (req, res) => {
  return res.redirect("/login");
});

export default viewsRoutes;
