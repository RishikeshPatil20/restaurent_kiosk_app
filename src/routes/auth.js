import express from "express";
import { registerKiosk, login, profile } from "../controllers/authController.js";
import { authenticateJWT } from "../middleware/jwtAuthMiddleware.js";

const authRoutes = express.Router();

// Render registration page
authRoutes.get("/register", (req, res) => {
  res.render("auth/register", { error: null });
});

// Handle form submission
authRoutes.post("/register-kiosk", registerKiosk);
authRoutes.post("/login", login); // anyone
authRoutes.get("/profile", authenticateJWT, profile); // logged in only

// Logout
authRoutes.post("/logout", (req, res) => {
  res.clearCookie("token"); // if JWT stored in cookies
  return res.redirect("/login");
});
export default authRoutes;
