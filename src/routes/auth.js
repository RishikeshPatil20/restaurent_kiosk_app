import express from "express";
import { registerKiosk, login, logout, profile } from "../controllers/authController.js";
import { authenticateJWT } from "../middleware/jwtAuthMiddleware.js";

const authRoutes = express.Router();

// Old registration URL → canonical page
authRoutes.get("/register", (req, res) => res.redirect("/register"));

// Handle form submission
authRoutes.post("/register-kiosk", registerKiosk);
authRoutes.post("/login", login); // anyone
authRoutes.get("/profile", authenticateJWT, profile); // logged in only

// Logout
authRoutes.post("/logout", logout);

export default authRoutes;
