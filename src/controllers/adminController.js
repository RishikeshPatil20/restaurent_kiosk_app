import bcrypt from "bcrypt";
import { Op } from "sequelize";
import { User, Order, OrderEvent, Cart, CartItem } from "../models/index.js";
import { MIN_PASSWORD_LENGTH, parseId } from "../utils/request.js";

const USERS_NOTICES = {
  deleted: { type: "success", text: "User deleted successfully." },
  "not-found": { type: "danger", text: "That user no longer exists." },
  self: { type: "danger", text: "You can’t delete your own account." },
};

const describeEvent = (event) => {
  if (event.event_type === "status_update") {
    return `Order #${event.order_id} → ${event.payload?.newStatus ?? "updated"}`;
  }
  if (event.event_type === "payment_success") {
    return `Order #${event.order_id} → paid`;
  }
  return `Order #${event.order_id} → ${event.event_type}`;
};

export const getDashboardStats = async () => {
  const [totalUsers, staffCount, totalOrders, pendingOrders, recentEvents] = await Promise.all([
    User.count(),
    User.count({ where: { role: "staff" } }),
    Order.count(),
    Order.count({ where: { status: { [Op.in]: ["pending", "accepted", "preparing"] }, payment_status: "paid" } }),
    OrderEvent.findAll({ limit: 8, order: [["created_at", "DESC"]] }),
  ]);

  return {
    totalUsers,
    staffCount,
    totalOrders,
    pendingOrders,
    recentActivity: recentEvents.map(describeEvent),
  };
};

// ================== Pages ==================
export const renderDashboard = async (req, res) => {
  const stats = await getDashboardStats();
  res.render("admin/dashboard", { title: "Admin Dashboard", user: req.user, stats });
};

export const renderUsers = async (req, res) => {
  const users = await User.findAll({
    attributes: ["id", "email", "role", "createdAt"],
    order: [["created_at", "DESC"]],
  });

  res.render("admin/manage-users-admin", {
    title: "Manage Users",
    users,
    user: req.user,
    notice: USERS_NOTICES[req.query.notice] ?? null,
  });
};

export const renderCreateStaff = (req, res) => {
  res.render("admin/create-staff-admin", {
    title: "Create Staff",
    user: req.user,
    error: null,
    email: "",
  });
};

// Admin only: create staff
export const createStaff = async (req, res) => {
  const email = typeof req.body.email === "string" ? req.body.email.trim() : "";
  const { password } = req.body;

  const fail = (status, error) =>
    res.status(status).render("admin/create-staff-admin", {
      title: "Create Staff",
      user: req.user,
      error,
      email,
    });

  if (!email || !password) return fail(400, "Email and password are required");
  if (password.length < MIN_PASSWORD_LENGTH) {
    return fail(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  const existing = await User.findOne({ where: { email } });
  if (existing) return fail(409, "A user with this email already exists");

  const hash = await bcrypt.hash(password, 10);
  const staff = await User.create({
    email,
    password_hash: hash,
    role: "staff",
  });

  res.status(201).render("admin/staff-success", {
    title: "Staff Created",
    user: req.user,
    staff,
  });
};

// ================== JSON API ==================
export const listUsers = async (req, res) => {
  const users = await User.findAll({
    attributes: ["id", "email", "role", "createdAt"],
  });

  res.json(users);
};

// Admin only: delete a user
export const deleteUser = async (req, res) => {
  const id = parseId(req.params.id);

  if (id === req.user.id) {
    return res.redirect("/api/admin/users?notice=self");
  }

  const user = id && (await User.findByPk(id));
  if (!user) return res.redirect("/api/admin/users?notice=not-found");

  // Remove the user's carts; orders are kept for history
  const carts = await Cart.findAll({ where: { user_id: user.id }, attributes: ["id"] });
  const cartIds = carts.map((c) => c.id);
  if (cartIds.length) {
    await CartItem.destroy({ where: { cart_id: cartIds } });
    await Cart.destroy({ where: { id: cartIds } });
  }

  await user.destroy();
  res.redirect("/api/admin/users?notice=deleted");
};
