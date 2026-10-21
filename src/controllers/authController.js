import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User, Order, OrderItem } from "../models/index.js";
import { homeFor, MIN_PASSWORD_LENGTH } from "../utils/request.js";

const ROLES = ["admin", "staff", "kiosk"];

const generateToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.SECRET_KEY, {
    expiresIn: "1d",
  });

// Store token in httpOnly cookie
const setAuthCookie = (res, token) =>
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  });

const wantsJsonResponse = (req) => req.headers.accept?.includes("application/json");

const normalizeEmail = (email) => (typeof email === "string" ? email.trim() : "");

// Anyone can create kiosk user
export const registerKiosk = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const { password } = req.body;

  const fail = (status, error) => {
    if (wantsJsonResponse(req)) return res.status(status).json({ message: error });
    return res.status(status).render("auth/register", { title: "Register", error, email });
  };

  if (!email || !password) {
    return fail(400, "Email and password are required");
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return fail(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  const existing = await User.findOne({ where: { email } });
  if (existing) {
    return fail(409, "User already exists");
  }

  const hash = await bcrypt.hash(password, 10);

  const kioskUser = await User.create({
    email,
    password_hash: hash,
    role: "kiosk",
  });

  const token = generateToken(kioskUser);
  setAuthCookie(res, token);

  // If API request → JSON
  if (wantsJsonResponse(req)) {
    return res.status(201).json({
      message: "Kiosk user registered successfully",
      user: {
        id: kioskUser.id,
        email: kioskUser.email,
        role: kioskUser.role,
      },
      token,
    });
  }

  return res.redirect("/kiosk");
};

// ------------------------- LOGIN -------------------------
export const login = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const { password, role } = req.body;

  const fail = (status, error) =>
    res.status(status).render("auth/login", { title: "Login", error, email, role });

  if (!email || !password || !ROLES.includes(role)) {
    return fail(400, "Please enter your email, password and role.");
  }

  const user = await User.findOne({ where: { email } });

  // Same message for unknown email and wrong password, so accounts can't be enumerated
  const valid = user && (await bcrypt.compare(password, user.password_hash));
  if (!valid) {
    return fail(401, "Invalid email or password.");
  }

  // Role mismatch
  if (user.role !== role) {
    return fail(403, `This account cannot log in as ${role}.`);
  }

  // ✅ Generate JWT token
  setAuthCookie(res, generateToken(user));

  // ✅ Redirect based on user role
  return res.redirect(homeFor(user.role));
};

export const logout = (req, res) => {
  res.clearCookie("token");
  return res.redirect("/login");
};

// Authenticated profile
export const profile = async (req, res) => {
  const user = await User.findByPk(req.user.id, {
    attributes: ["id", "email", "role", "createdAt"],
  });

  if (!user) return res.status(404).json({ message: "User not found" });

  //  Fetch past orders with items
  const orders = await Order.findAll({
    where: { customer_id: user.id },
    include: [{ model: OrderItem, as: "items" }],
    order: [["created_at", "DESC"]],
  });

  // JSON API response
  if (wantsJsonResponse(req)) {
    return res.json({ user, orders });
  }

  // Render profile page
  res.render("auth/profile", { title: "Profile", user, orders, homeUrl: homeFor(user.role) });
};
