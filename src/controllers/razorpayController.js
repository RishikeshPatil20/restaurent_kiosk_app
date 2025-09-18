// backend/src/controllers/razorpayController.js
import Razorpay from "razorpay";
import crypto from "crypto";
import { Payment, Order } from "../models/index.js";

let razorpay = null;

// Initialize Razorpay only if keys exist
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

export const initiatePayment = async (req, res) => {
  try {
    const { orderId, amount } = req.body;
    const order = await Order.findByPk(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // ✅ If Razorpay not configured → Dummy Mode
    if (!razorpay) {
      console.log("⚠️ Razorpay keys not configured → Running Dummy Mode");
      await Payment.create({
        order_id: order.id,
        provider: "dummy",
        amount,
        status: "success", // simulate success
        transaction_id: "DUMMY-" + Date.now(),
      });
      return res.render("kiosk/paymentStatus", { order, status: "success (simulated)" });
    }

    // Real Razorpay Order
    try {
      const options = {
        amount: amount * 100, // in paise
        currency: "INR",
        receipt: `order_rcptid_${orderId}`,
      };

      const razorpayOrder = await razorpay.orders.create(options);

      // Store payment record
      await Payment.create({
        order_id: order.id,
        provider: "razorpay",
        amount,
        status: "initiated",
        transaction_id: razorpayOrder.id,
      });

      return res.render("kiosk/payment", {
        order,
        razorpayKey: process.env.RAZORPAY_KEY_ID,
        razorpayOrderId: razorpayOrder.id,
        amount: amount * 100,
        currency: "INR",
      });
    } catch (err) {
      // ✅ Fallback if Razorpay auth fails
      if (err.statusCode === 401) {
        console.warn("⚠️ Razorpay authentication failed → Switching to Dummy Mode");
        await Payment.create({
          order_id: order.id,
          provider: "dummy",
          amount,
          status: "success",
          transaction_id: "DUMMY-" + Date.now(),
        });
        return res.render("kiosk/paymentStatus", { order, status: "success (simulated)" });
      }
      throw err; // rethrow other errors
    }
  } catch (err) {
    console.error("Razorpay initiate error:", err);
    res.status(500).json({ message: "Payment initiation failed" });
  }
};

// ✅ Verify Razorpay signature
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay) {
      return res.json({ message: "Dummy mode active → No verification needed" });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      await Payment.update(
        { status: "success", provider_response: req.body },
        { where: { transaction_id: razorpay_order_id } }
      );
      return res.json({ message: "Payment verified successfully" });
    } else {
      await Payment.update(
        { status: "failed", provider_response: req.body },
        { where: { transaction_id: razorpay_order_id } }
      );
      return res.status(400).json({ message: "Invalid signature" });
    }
  } catch (err) {
    console.error("Verify payment error:", err);
    res.status(500).json({ message: "Payment verification failed" });
  }
};
