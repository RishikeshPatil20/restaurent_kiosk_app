// backend/src/routes/payments.js
import express from "express";

import { verifyPayment, razorpayWebhook } from "../controllers/razorpayController.js";
import { authenticateJWT } from "../middleware/jwtAuthMiddleware.js";
import { authorizeRole } from "../middleware/roleMiddleware.js";

const paymentsRoutes = express.Router();

// Payments are started by POST /checkout; this confirms a Razorpay payment from the browser
paymentsRoutes.post("/verify", authenticateJWT, authorizeRole(["kiosk"]), verifyPayment);

// Called by Razorpay's servers (authenticated by the webhook signature, not a login)
paymentsRoutes.post("/webhook", razorpayWebhook);

export default paymentsRoutes;
