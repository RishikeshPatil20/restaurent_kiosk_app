// backend/src/routes/payments.js
import express from "express";

import { initiatePayment, verifyPayment } from "../controllers/razorpayController.js";
import { authenticateJWT } from "../middleware/jwtAuthMiddleware.js";

const paymentsRoutes = express.Router();

paymentsRoutes.post("/initiate", authenticateJWT, initiatePayment);
paymentsRoutes.post("/verify", verifyPayment);
export default paymentsRoutes;

