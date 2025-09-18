// backend/src/controllers/checkoutController.js
import { Cart, CartItem, Menu, Order, OrderItem, OrderEvent } from "../models/index.js";
import { initiatePayment } from "./razorpayController.js";

export const proceedToCheckout = async (req, res) => {
  try {
    const userId = req.user.id;

    // 🔎 Find active cart
    const cart = await Cart.findOne({
      where: { user_id: userId, status: "active" },
      include: [{ model: CartItem, as: "items", include: [{ model: Menu, as: "menu" }] }]
    });

    if (!cart || !cart.items.length) {
      return res.status(400).render("errors/400", { message: "Cart is empty!" });
    }

    // 💰 Calculate total
    let totalAmount = 0;
    const orderItems = cart.items.map(item => {
      totalAmount += item.quantity * item.price;
      return {
        menu_snapshot_name: item.menu.item_name,
        quantity: item.quantity,
        item_price: item.price,
      };
    });

    // 📝 Create Order
    const order = await Order.create(
      {
        idempotency_key: `checkout-${Date.now()}-${userId}`,
        customer_id: userId,
        customer_name: req.user.email,
        order_code: Math.floor(100000 + Math.random() * 900000),
        status: "pending",
        total_amount: totalAmount,
        items: orderItems,
        events: [{ event_type: "created", payload: { by: userId } }],
      },
      {
        include: [{ model: OrderItem, as: "items" }, { model: OrderEvent, as: "events" }],
      }
    );

    // ✅ Close cart
    await cart.update({ status: "checkedout" });

    // 🔊 Emit to staff/admin via Socket.IO
    const io = req.app.get("io");
    io.to("kitchen").emit("orderReceived", {
      id: order.id,
      customer_name: order.customer_name,
      total_amount: order.total_amount,
      status: order.status,
      items: order.items.map(i => ({
        menu_snapshot_name: i.menu_snapshot_name,
        quantity: i.quantity
      }))
    });
    console.log("🚀 [CHECKOUT] Emitting orderReceived:", order.id);

    // 🔀 Forward to Razorpay controller
    req.body = { orderId: order.id, amount: totalAmount };
    return initiatePayment(req, res);

  } catch (err) {
    console.error("Checkout error:", err);
    res.status(500).render("errors/500", { message: "Checkout failed" });
  }
};
