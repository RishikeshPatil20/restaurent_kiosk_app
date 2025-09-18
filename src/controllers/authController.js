import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User, Order, OrderItem } from "../models/index.js";

const generateToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.SECRET_KEY, {
    expiresIn: "1d",
  });
// Anyone can create kiosk user
export const registerKiosk = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      // Handle form or API request
      if (req.headers.accept?.includes("application/json")) {
        return res
          .status(400)
          .json({ message: "Email and password are required" });
      }
      return res
        .status(400)
        .render("auth/register", { error: "Email and password are required" });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      if (req.headers.accept?.includes("application/json")) {
        return res.status(409).json({ message: "User already exists" });
      }
      return res
        .status(409)
        .render("auth/register", { error: "User already exists" });
    }

    const hash = await bcrypt.hash(password, 10);

    const kioskUser = await User.create({
      email,
      password_hash: hash,
      role: "kiosk",
    });

    const token = generateToken(kioskUser);

    // Store token in httpOnly cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    // If API request → JSON
    if (req.headers.accept?.includes("application/json")) {
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

    // If form → redirect to profile/dashboard
    res.redirect("/profile");
  } catch (err) {
    console.error("Kiosk register error:", err);

    if (req.headers.accept?.includes("application/json")) {
      return res.status(500).json({ message: "Internal server error" });
    }

    res
      .status(500)
      .render("auth/register", { error: "Something went wrong, try again!" });
  }
};
// Login for all users
export const login = async (req, res) => {
  try {
    const { email, password, role } = req.body; 

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ message: "Invalid credentials" });

    // 🔒 Role verification
    if (user.role !== role) {
      return res.status(403).render("errors/error", {
        code: 403,
        message: `Role mismatch. You cannot log in as ${role}`,
        url: req.originalUrl,
      });
    }

    const token = generateToken(user);

    // Store in HttpOnly cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    // Redirect based on selected role
    if (role === "admin") {
      return res.redirect("/admin");
    } else if (role === "staff") {
      return res.redirect("/staff");
    } else {
      return res.redirect("/kiosk");
    }
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Authenticated profile
export const profile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "email", "role", "created_at"],
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    //  Fetch past orders with items
    const orders = await Order.findAll({
      where: { customer_id: user.id },
      include: [{ model: OrderItem, as: "items" }],
      order: [["created_at", "DESC"]],
    });

    // JSON API response
    if (req.headers.accept?.includes("application/json")) {
      return res.json({ user, orders });
    }

    // Render profile page
    res.render("auth/profile", { user, orders });
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
