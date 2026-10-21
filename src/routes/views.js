import express from "express";
import { Op } from "sequelize";
import { getMenusForEjs } from "../controllers/menusController.js";
import { renderDashboard } from "../controllers/adminController.js";
import { reconcileOrderPayment } from "../controllers/razorpayController.js";
import { authenticateJWT } from "../middleware/jwtAuthMiddleware.js";
import { authorizeRole } from "../middleware/roleMiddleware.js";
import { Order, OrderItem } from "../models/index.js";
import { homeFor, parseId } from "../utils/request.js";

const viewsRoutes = express.Router();

// Logged-in users skip the login/register pages
const redirectIfLoggedIn = (req, res, next) =>
  res.locals.user ? res.redirect(homeFor(res.locals.user.role)) : next();

// Public login page
viewsRoutes.get("/login", redirectIfLoggedIn, (req, res) => {
  return res.render("auth/login", { title: "Login", error: null, email: "", role: "" });
});

// Public registration page (kiosk accounts)
viewsRoutes.get("/register", redirectIfLoggedIn, (req, res) => {
  return res.render("auth/register", { title: "Register", error: null, email: "" });
});

// Kiosk ordering page
viewsRoutes.get("/kiosk", authenticateJWT, authorizeRole(["kiosk"]), async (req, res) => {
  const menus = await getMenusForEjs();
  return res.render("kiosk/index", { title: "Menu", menus, user: req.user });
});

// Result page after checkout/payment
viewsRoutes.get(
  "/payment-status/:orderId",
  authenticateJWT,
  authorizeRole(["kiosk"]),
  async (req, res) => {
    const id = parseId(req.params.orderId);
    const order = id && (await Order.findByPk(id));
    if (!order || order.customer_id !== req.user.id) {
      return res.status(404).render("errors/404", { title: "Not Found", url: req.originalUrl });
    }

    // If the browser closed before /verify ran, ask Razorpay whether the payment went through
    await reconcileOrderPayment(order, req.app.get("io"));

    const status = order.payment_status === "paid" ? "success" : order.payment_status === "failed" ? "failed" : "pending";
    return res.render("kiosk/paymentStatus", { title: "Payment", order, status, simulated: false });
  }
);

// Kitchen staff dashboard: paid orders that still need work
viewsRoutes.get("/staff", authenticateJWT, authorizeRole(["staff", "admin"]), async (req, res) => {
  const orders = await Order.findAll({
    where: {
      payment_status: "paid",
      status: { [Op.notIn]: ["served", "cancelled"] },
    },
    include: [{ model: OrderItem, as: "items" }],
    order: [["created_at", "ASC"]],
  });

  return res.render("kitchen/dashboard", { title: "Kitchen", user: req.user, orders });
});

// Admin dashboard (admin only)
viewsRoutes.get("/admin", authenticateJWT, authorizeRole(["admin"]), renderDashboard);

// Default root: role home page, or login
viewsRoutes.get("/", (req, res) => {
  return res.redirect(res.locals.user ? homeFor(res.locals.user.role) : "/login");
});

export default viewsRoutes;
