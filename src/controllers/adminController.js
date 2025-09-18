import bcrypt from "bcrypt";
import { User } from "../models/index.js";

// Admin only: create staff
export const createStaff = async (req, res) => {
  try {
    const { email, password } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(409).json({ message: "User already exists" });

    const hash = await bcrypt.hash(password, 10);

    const staff = await User.create({
      email,
      password_hash: hash,
      role: "staff",
    });

    res.status(201).json({
      message: "Staff created successfully",
      user: { id: staff.id, email: staff.email, role: staff.role },
    });
  } catch (err) {
    console.error("Create staff error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const getDashboardStats = async () => {
  try {
    const totalUsers = await User.count(); // total users
    const staffCount = await User.count({ where: { role: "staff" } }); // staff only

    // ⚠️ Replace with actual DB queries for orders table when ready
    const pendingOrders = 8;

    // Example recent activity — you’ll later replace with real activity logs table
    const recentActivity = [
      "User John Doe registered a kiosk account",
      "Staff Jane updated menu item 'Paneer Butter Masala'",
      "Order #1023 marked as completed",
    ];

    return { totalUsers, staffCount, pendingOrders, recentActivity };
  } catch (err) {
    console.error("Dashboard stats error:", err);
    throw err;
  }
};

export const listUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ["id", "email", "role", "created_at"],
    });

    res.json(users);
  } catch (err) {
    console.error("List users error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Admin only: delete a user
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);

    if (!user) return res.status(404).json({ message: "User not found" });

    await user.destroy();
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
