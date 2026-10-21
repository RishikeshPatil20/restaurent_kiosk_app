// backend/src/controllers/checkoutController.js
import crypto from "crypto";
import { UniqueConstraintError } from "sequelize";
import { Cart, CartItem, Menu, Order, OrderItem, OrderEvent } from "../models/index.js";
import { toPaise } from "../models/money.js";
import { startPayment } from "./razorpayController.js";

const renderCheckoutError = (res, message) =>
  res.status(400).render("errors/error", {
    title: "Checkout",
    code: 400,
    message,
    url: null,
    stack: null,
  });

export const proceedToCheckout = async (req, res) => {
  const userId = req.user.id;

  // 🔎 Find active cart
  const cart = await Cart.findOne({
    where: { user_id: userId, status: "active" },
    include: [{ model: CartItem, as: "items", include: [{ model: Menu, as: "menu" }] }],
    order: [[{ model: CartItem, as: "items" }, "id", "ASC"]],
  });

  if (!cart || !cart.items.length) {
    return renderCheckoutError(res, "Your cart is empty. Add some items before checking out.");
  }

  const unavailable = cart.items.filter((item) => !item.menu || !item.menu.available);
  if (unavailable.length) {
    const names = unavailable.map((i) => i.menu?.item_name || "an item").join(", ");
    return renderCheckoutError(
      res,
      `Sorry, ${names} is no longer available. Please remove it from your cart and try again.`
    );
  }

  // 💰 Calculate total in integer paise using current menu prices
  let totalPaise = 0;
  const orderItems = cart.items.map((item) => {
    totalPaise += toPaise(item.menu.item_price) * item.quantity;
    return {
      menu_id: item.menu.id,
      menu_snapshot_name: item.menu.item_name,
      quantity: item.quantity,
      item_price: item.menu.item_price,
    };
  });

  // Same cart + same contents => same key, so double submits reuse one order
  const fingerprint = crypto
    .createHash("sha256")
    .update(JSON.stringify(orderItems.map((i) => [i.menu_id, i.quantity, i.item_price])))
    .digest("hex")
    .slice(0, 16);
  const idempotencyKey = `cart-${cart.id}-${fingerprint}`;
  const include = [{ model: OrderItem, as: "items" }];

  let order = await Order.findOne({ where: { idempotency_key: idempotencyKey }, include });
  if (!order) {
    try {
      // 📝 Create Order (sent to the kitchen only after payment succeeds)
      order = await Order.create(
        {
          idempotency_key: idempotencyKey,
          customer_id: userId,
          customer_name: req.user.email,
          status: "pending",
          payment_status: "unpaid",
          total_amount: totalPaise / 100,
          items: orderItems,
          events: [{ event_type: "created", payload: { by: userId } }],
        },
        {
          include: [...include, { model: OrderEvent, as: "events" }],
        }
      );
    } catch (err) {
      if (!(err instanceof UniqueConstraintError)) throw err;
      order = await Order.findOne({ where: { idempotency_key: idempotencyKey }, include });
    }
  }

  if (order.payment_status === "paid") {
    return res.redirect(`/payment-status/${order.id}`);
  }

  // 🔀 Hand over to the payment provider
  return startPayment(req, res, order);
};
