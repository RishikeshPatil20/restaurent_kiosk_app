// backend/src/controllers/razorpayController.js
//
// Razorpay flow (test or live depends only on the keys in .env):
//  1. POST /checkout → startPayment(): create (or reuse) a Razorpay order for our Order and
//     render kiosk/payment.ejs, which opens Razorpay Checkout (public/js/payment.js).
//  2. Customer pays → Checkout returns { razorpay_order_id, razorpay_payment_id, razorpay_signature }
//     → POST /api/payments/verify → verifyPayment(): check the signature, fetch the payment,
//     capture it if it is only "authorized", then markOrderPaid() (kitchen gets the order).
//  3. Safety nets for closed browsers / network drops (all idempotent):
//     - GET /payment-status/:id → reconcileOrderPayment() asks Razorpay for the order's payments.
//     - POST /api/payments/webhook → razorpayWebhook() (needs a public URL + RAZORPAY_WEBHOOK_SECRET).
//  4. Staff cancels a paid order → refundOrder() refunds it through Razorpay.
import Razorpay from "razorpay";
import crypto from "crypto";
import { Payment, Order, OrderEvent } from "../models/index.js";
import { toPaise } from "../models/money.js";
import { markOrderPaid } from "../services/orders.js";

let razorpay = null;

// Initialize Razorpay only if keys exist
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// Without keys, development falls back to simulated payments
const dummyAllowed = process.env.NODE_ENV !== "production";

// The Razorpay SDK rejects with plain objects ({ statusCode, error: { code, description } })
export const describeRazorpayError = (err) =>
  `${err?.statusCode ?? ""} ${err?.error?.description || err?.error?.code || err?.message || JSON.stringify(err)}`.trim();

const hmacHex = (secret, data) => crypto.createHmac("sha256", secret).update(data).digest("hex");

const signaturesMatch = (expected, received) => {
  const a = Buffer.from(expected);
  const b = Buffer.from(String(received ?? ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const completeDummyPayment = async (req, res, order) => {
  await Payment.create({
    order_id: order.id,
    provider: "dummy",
    amount: order.total_amount,
    status: "success", // simulate success
    transaction_id: `DUMMY-${order.id}-${Date.now()}`,
  });
  await markOrderPaid(order, { io: req.app.get("io"), provider: "dummy" });
  return res.render("kiosk/paymentStatus", {
    title: "Payment",
    order,
    status: "success",
    simulated: true,
  });
};

const renderPaymentUnavailable = (res, order) =>
  res.status(503).render("kiosk/paymentStatus", {
    title: "Payment",
    order,
    status: "failed",
    simulated: false,
  });

// Retrying payment for the same unpaid order reuses its Razorpay order
const getOrCreateRazorpayOrder = async (order) => {
  const amountPaise = toPaise(order.total_amount);

  const existing = await Payment.findOne({
    where: { order_id: order.id, provider: "razorpay", status: "initiated" },
    order: [["created_at", "DESC"]],
  });
  if (existing && toPaise(existing.amount) === amountPaise) {
    return existing.transaction_id;
  }

  const razorpayOrder = await razorpay.orders.create({
    amount: amountPaise, // in paise
    currency: "INR",
    receipt: `order_${order.id}`,
    notes: { order_id: String(order.id), customer: order.customer_name ?? "" },
  });

  // Store payment record
  await Payment.create({
    order_id: order.id,
    provider: "razorpay",
    amount: order.total_amount,
    status: "initiated",
    transaction_id: razorpayOrder.id,
  });

  return razorpayOrder.id;
};

// Called from checkout with an unpaid order owned by req.user
export const startPayment = async (req, res, order) => {
  // ✅ If Razorpay not configured → Dummy Mode
  if (!razorpay) {
    if (!dummyAllowed) return renderPaymentUnavailable(res, order);
    console.warn("⚠️ Razorpay keys not configured → using dummy payment");
    return completeDummyPayment(req, res, order);
  }

  let razorpayOrderId;
  try {
    razorpayOrderId = await getOrCreateRazorpayOrder(order);
  } catch (err) {
    // 401 here means RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are wrong
    console.error("❌ Razorpay order creation failed:", describeRazorpayError(err));
    return renderPaymentUnavailable(res, order);
  }

  return res.render("kiosk/payment", {
    title: "Payment",
    order,
    razorpayKey: process.env.RAZORPAY_KEY_ID,
    razorpayOrderId,
    amount: toPaise(order.total_amount),
    currency: "INR",
    email: req.user.email,
  });
};

/**
 * Brings our Payment row in line with a Razorpay payment entity: captures it if it is only
 * authorized, then marks the order paid. Idempotent — verify, webhook and reconcile can all
 * call it for the same payment. Returns true once the payment is captured.
 */
const settleRazorpayPayment = async (payment, razorpayPayment, io) => {
  if (payment.status === "refunded") return true;

  if (razorpayPayment.amount !== toPaise(payment.amount)) {
    throw new Error(
      `Amount mismatch for ${razorpayPayment.id}: got ${razorpayPayment.amount}, expected ${toPaise(payment.amount)}`
    );
  }

  let settled = razorpayPayment;
  if (settled.status === "authorized") {
    // Accounts without auto-capture: capture now, otherwise Razorpay refunds it automatically
    settled = await razorpay.payments.capture(settled.id, settled.amount, settled.currency);
  }
  if (settled.status !== "captured") return false;

  if (payment.status !== "success") {
    await payment.update({
      status: "success",
      provider_response: {
        razorpay_payment_id: settled.id,
        method: settled.method,
        status: settled.status,
      },
    });
  }

  const order = payment.order ?? (await Order.findByPk(payment.order_id));
  await markOrderPaid(order, { io, provider: "razorpay" });
  return true;
};

// ✅ Verify Razorpay signature (called by the checkout page after payment)
export const verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay) {
    return res.status(400).json({ message: "Online payments are not configured" });
  }
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ message: "Missing payment details" });
  }

  const payment = await Payment.findOne({
    where: { transaction_id: String(razorpay_order_id), provider: "razorpay" },
    include: [{ model: Order, as: "order" }],
  });
  if (!payment || payment.order?.customer_id !== req.user.id) {
    return res.status(404).json({ message: "Payment not found" });
  }

  const expectedSignature = hmacHex(
    process.env.RAZORPAY_KEY_SECRET,
    `${razorpay_order_id}|${razorpay_payment_id}`
  );
  if (!signaturesMatch(expectedSignature, razorpay_signature)) {
    return res.status(400).json({ message: "Payment could not be verified" });
  }

  try {
    const razorpayPayment = await razorpay.payments.fetch(String(razorpay_payment_id));
    if (razorpayPayment.order_id !== razorpay_order_id) {
      return res.status(400).json({ message: "Payment does not belong to this order" });
    }
    await settleRazorpayPayment(payment, razorpayPayment, req.app.get("io"));
  } catch (err) {
    // The signature is valid, so the money is with Razorpay; the status page retries the check
    console.error("⚠️ Razorpay settle failed during verify:", describeRazorpayError(err));
  }

  return res.json({
    message: "Payment received",
    redirect: `/payment-status/${payment.order_id}`,
  });
};

// Status page safety net: ask Razorpay directly whether an unpaid order was actually paid
export const reconcileOrderPayment = async (order, io) => {
  if (!razorpay || order.payment_status === "paid") return;

  const payments = await Payment.findAll({
    where: { order_id: order.id, provider: "razorpay", status: "initiated" },
  });

  for (const payment of payments) {
    try {
      const { items = [] } = await razorpay.orders.fetchPayments(payment.transaction_id);
      const paid = items.find((p) => p.status === "captured") ?? items.find((p) => p.status === "authorized");
      if (paid && (await settleRazorpayPayment(payment, paid, io))) {
        await order.reload();
        return;
      }
    } catch (err) {
      console.error(`⚠️ Razorpay reconcile failed for order ${order.id}:`, describeRazorpayError(err));
    }
  }
};

// Razorpay → server notifications (Dashboard → Settings → Webhooks). Body must be the raw bytes.
export const razorpayWebhook = async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!razorpay || !secret) {
    return res.status(404).json({ message: "Not Found" });
  }

  const expected = hmacHex(secret, req.rawBody ?? "");
  if (!signaturesMatch(expected, req.get("x-razorpay-signature"))) {
    return res.status(400).json({ message: "Invalid signature" });
  }

  const { event, payload } = req.body;
  const entity = payload?.payment?.entity;

  if (entity && ["payment.authorized", "payment.captured", "order.paid"].includes(event)) {
    const payment = await Payment.findOne({
      where: { transaction_id: entity.order_id, provider: "razorpay" },
      include: [{ model: Order, as: "order" }],
    });
    if (payment) {
      await settleRazorpayPayment(payment, entity, req.app.get("io"));
    }
  } else if (entity && event === "payment.failed") {
    console.warn(
      `⚠️ Razorpay payment ${entity.id} failed for ${entity.order_id}: ${entity.error_description ?? "unknown reason"}`
    );
  }

  // Acknowledge every correctly signed event so Razorpay stops retrying it
  res.json({ status: "ok" });
};

// Refunds every successful payment of an order (used when staff cancels a paid order)
export const refundOrder = async (order) => {
  const payments = await Payment.findAll({ where: { order_id: order.id, status: "success" } });

  for (const payment of payments) {
    let refundId = null;

    if (payment.provider === "razorpay") {
      const paymentId = payment.provider_response?.razorpay_payment_id;
      if (!razorpay || !paymentId) {
        throw new Error(`Cannot refund payment ${payment.id}: Razorpay payment id or keys missing`);
      }
      const refund = await razorpay.payments.refund(paymentId, {
        amount: toPaise(payment.amount),
        notes: { order_id: String(order.id), reason: "Order cancelled by staff" },
      });
      refundId = refund.id;
    }

    await payment.update({
      status: "refunded",
      provider_response: { ...(payment.provider_response ?? {}), refund_id: refundId },
    });
    await OrderEvent.create({
      order_id: order.id,
      event_type: "refund",
      payload: { provider: payment.provider, refund_id: refundId, amount: payment.amount },
    });
  }
};
