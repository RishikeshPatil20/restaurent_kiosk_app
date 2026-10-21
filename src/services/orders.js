// backend/src/services/orders.js
import { sequelizeInstance, Cart, OrderEvent, OrderItem } from "../models/index.js";
import { userRoom } from "../sockets/kitchenSocket.js";

// Token numbers restart every day in the restaurant's local time
export const BUSINESS_TIMEZONE = process.env.BUSINESS_TIMEZONE || "Asia/Kolkata";

// Order lifecycle shared by the kitchen UI and the API
export const ORDER_TRANSITIONS = {
  pending: ["accepted", "cancelled"],
  accepted: ["preparing"],
  preparing: ["ready"],
  ready: ["served"],
  served: [],
  cancelled: [],
};

// Plain object safe to send over Socket.IO
export const toKitchenPayload = (order) => ({
  id: order.id,
  order_code: order.order_code,
  table_number: order.table_number,
  customer_name: order.customer_name,
  total_amount: order.total_amount,
  status: order.status,
  payment_status: order.payment_status,
  created_at: order.createdAt,
  items: (order.items || []).map((i) => ({
    menu_snapshot_name: i.menu_snapshot_name,
    quantity: i.quantity,
  })),
});

/**
 * Single place where an order becomes "paid":
 * assigns the daily token number, marks the order, records the event,
 * closes the customer's cart and notifies the kitchen.
 */
export const markOrderPaid = async (order, { io, provider }) => {
  if (order.payment_status === "paid") return order;

  await sequelizeInstance.transaction(async (transaction) => {
    // Serialize token assignment so two simultaneous payments never share a number
    await sequelizeInstance.query("SELECT pg_advisory_xact_lock(hashtext('orders.order_code'))", {
      transaction,
    });
    const [[{ next_code: nextCode }]] = await sequelizeInstance.query(
      `SELECT COALESCE(MAX(order_code), 0) + 1 AS next_code
         FROM orders
        WHERE payment_status = 'paid'
          AND (created_at AT TIME ZONE :tz)::date =
              (SELECT (created_at AT TIME ZONE :tz)::date FROM orders WHERE id = :id)`,
      { replacements: { id: order.id, tz: BUSINESS_TIMEZONE }, transaction }
    );

    await order.update({ payment_status: "paid", order_code: nextCode }, { transaction });
    await OrderEvent.create(
      { order_id: order.id, event_type: "payment_success", payload: { provider } },
      { transaction }
    );
  });

  // The cart stays active until payment succeeds, so a failed payment never loses it
  if (order.customer_id) {
    await Cart.update(
      { status: "checkedout" },
      { where: { user_id: order.customer_id, status: "active" } }
    );
  }

  if (!order.items) {
    await order.reload({ include: [{ model: OrderItem, as: "items" }] });
  }

  if (io) {
    io.to("kitchen").emit("orderReceived", toKitchenPayload(order));
    if (order.customer_id) {
      io.to(userRoom(order.customer_id)).emit("paymentStatusUpdated", {
        orderId: order.id,
        paymentStatus: "paid",
      });
    }
  }

  return order;
};
