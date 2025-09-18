// backend/src/routes/checkout.js
import express from "express";
import { authenticateJWT } from "../middleware/jwtAuthMiddleware.js";
import { authorizeRole } from "../middleware/roleMiddleware.js";
import { proceedToCheckout } from "../controllers/checkOutController.js";

const checkoutRoutes = express.Router();

checkoutRoutes.post("/", authenticateJWT, authorizeRole(["kiosk"]), proceedToCheckout);

export default checkoutRoutes;
