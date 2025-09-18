// backend/src/controllers/paymentController.js
import crypto from "crypto";
import axios from "axios";
import { Payment, Order, OrderEvent } from "../models/index.js";
import { phonePeConfig } from "../config/phonePe.js";

// ===================== INITIATE PAYMENT (Kiosk only) =====================
export const initiatePayment = async (req, res) => {
  console.log("Loaded ENV:", {
    merchantId: process.env.PHONEPE_MERCHANT_ID,
    saltKey: process.env.PHONEPE_SALT_KEY,
    saltIndex: process.env.PHONEPE_SALT_INDEX,
  });

  try {
    const { orderId, amount } = req.body;

    console.log("💳 initiatePayment hit with body:", req.body);

    if (!orderId || !amount) {
      return res.status(400).json({ message: "Missing orderId or amount" });
    }

    const order = await Order.findByPk(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Build PhonePe payload
    const payload = {
      merchantId: phonePeConfig.merchantId,
      transactionId: `TXN-${Date.now()}`,
      amount: amount * 100, // paise
      merchantOrderId: order.id,
      callbackUrl: `${process.env.BASE_URL}/api/payments/callback`,
      paymentInstrument: { type: "UPI_INTENT" },
    };

    const payloadString = Buffer.from(JSON.stringify(payload)).toString(
      "base64"
    );
    const checksum =
      crypto
        .createHash("sha256")
        .update(
          payloadString + phonePeConfig.apiEndpoint + phonePeConfig.saltKey
        )
        .digest("hex") +
      "###" +
      phonePeConfig.saltIndex;

    console.log("💳 PayloadString:", payloadString);
    console.log("💳 X-VERIFY Checksum:", checksum);

    // Store payment record
    await Payment.create({
      order_id: order.id,
      provider: "phonepe",
      amount,
      status: "initiated", // ✅ fixed ENUM
      transaction_id: payload.transactionId,
    });

    // Send payload to PhonePe
    const response = await axios.post(
      `${phonePeConfig.baseUrl}${phonePeConfig.apiEndpoint}`,
      { request: payloadString },
      { headers: { "X-VERIFY": checksum, "Content-Type": "application/json" } }
    );

    const redirectUrl =
      response.data?.data?.instrumentResponse?.redirectInfo?.url;
    if (!redirectUrl) {
      return res
        .status(500)
        .json({ message: "Failed to generate payment URL" });
    }

    // ✅ Render redirect page
    res.render("kiosk/payment", { order, redirectUrl });
  } catch (err) {
    console.error("PhonePe initiate error:", err.response?.data || err.message);
    res.status(500).json({ message: "Payment initiation failed" });
  }
};

// ===================== PHONEPE CALLBACK =====================
export const paymentCallback = async (req, res) => {
  try {
    const { transactionId, code } = req.body;
    const io = req.app.get("io"); // socket instance

    const payment = await Payment.findOne({
      where: { transaction_id: transactionId },
    });
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    let status = "failed";
    if (code === "PAYMENT_SUCCESS") status = "success";
    else if (code === "PAYMENT_PENDING") status = "initiated"; // ✅ maps to ENUM

    await payment.update({ status });

    const order = await Order.findByPk(payment.order_id);
    if (order) {
      if (status === "success") {
        // Mark order as paid
        await order.update({ payment_status: "paid" });

        // Auto-update order status if still pending
        if (order.status === "pending") {
          await order.update({ status: "accepted" });

          await OrderEvent.create({
            order_id: order.id,
            event_type: "status_update",
            payload: { newStatus: "accepted", updatedBy: "system-auto" },
          });
        }
      }

      // 🔥 Emit real-time update
      io.to("kiosk").emit("paymentStatusUpdated", {
        orderId: order.id,
        paymentStatus: status,
        orderStatus: order.status,
      });
      io.to("kitchen").emit("paymentStatusUpdated", {
        orderId: order.id,
        paymentStatus: status,
        orderStatus: order.status,
      });
    }

    // ✅ Render status page
    res.render("kiosk/paymentStatus", { order, status });
  } catch (err) {
    console.error("PhonePe callback error:", err);
    res.status(500).json({ message: "Payment callback failed" });
  }
};

// ===================== VERIFY PAYMENT (Admin/Staff) =====================
export const verifyPayment = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const payment = await Payment.findOne({
      where: { transaction_id: transactionId },
    });
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    res.json(payment);
  } catch (err) {
    console.error("Verify payment error:", err);
    res.status(500).json({ message: "Payment verification failed" });
  }
};
