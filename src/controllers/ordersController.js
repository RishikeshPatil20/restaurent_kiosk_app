import { Order, OrderItem, OrderEvent, Menu } from "../models/index.js";
import { toPaise } from "../models/money.js";
import { parseId } from "../utils/request.js";
import { ORDER_TRANSITIONS } from "../services/orders.js";
import { userRoom } from "../sockets/kitchenSocket.js";
import { refundOrder, describeRazorpayError } from "./razorpayController.js";

// ===================== CREATE ORDER =====================
// API-only order creation. The order is unpaid and is not shown to the kitchen
// until a payment marks it paid (see services/orders.js → markOrderPaid).
export const createOrder = async (req, res) => {
  const { idempotency_key, table_number, customer_name, items, notes } = req.body;

  if (!idempotency_key || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Idempotency key and items are required" });
  }

  // Idempotency keys are scoped per user so one user cannot read another's order
  const scopedKey = `api-${req.user.id}-${idempotency_key}`;
  const existing = await Order.findOne({ where: { idempotency_key: scopedKey } });
  if (existing) {
    return res.status(200).json({ message: "Order already created", order: existing });
  }

  // Calculate total amount + prepare orderItems
  let totalPaise = 0;
  const orderItems = [];

  for (const item of items) {
    const menuId = parseId(item.menu_id);
    const quantity = Number(item.quantity);
    if (!menuId || !Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
      return res.status(400).json({ message: "Each item needs a valid menu_id and quantity (1-50)" });
    }

    const menu = await Menu.findByPk(menuId);
    if (!menu || !menu.available) {
      return res.status(400).json({ message: `Menu item ${menuId} unavailable` });
    }
    totalPaise += toPaise(menu.item_price) * quantity;
    orderItems.push({
      menu_id: menu.id,
      menu_snapshot_name: menu.item_name,
      quantity,
      item_price: menu.item_price,
    });
  }

  // Create order + items + initial event
  const order = await Order.create(
    {
      idempotency_key: scopedKey,
      table_number,
      customer_name,
      customer_id: req.user.id,
      notes,
      status: "pending",
      total_amount: totalPaise / 100,
      items: orderItems,
      events: [{ event_type: "created", payload: { by: req.user.id } }],
    },
    {
      include: [{ model: OrderItem, as: "items" }, { model: OrderEvent, as: "events" }],
    }
  );

  res.status(201).json({ message: "Order created successfully", order });
};

// ===================== GET MY ORDERS =====================
export const getMyOrders = async (req, res) => {
  const orders = await Order.findAll({
    where: { customer_id: req.user.id },
    include: [{ model: OrderItem, as: "items" }, { model: OrderEvent, as: "events" }],
    order: [["created_at", "DESC"]],
  });

  res.json(orders);
};

// ===================== GET ALL ORDERS (Staff/Admin) =====================
export const getAllOrders = async (req, res) => {
  const orders = await Order.findAll({
    include: [{ model: OrderItem, as: "items" }, { model: OrderEvent, as: "events" }],
    order: [["created_at", "DESC"]],
  });

  res.json(orders);
};

// ===================== UPDATE ORDER STATUS =====================
export const updateOrderStatus = async (req, res) => {
  const id = parseId(req.params.id);
  const { status } = req.body;
  const io = req.app.get("io");

  if (!id) return res.status(404).json({ message: "Order not found" });
  if (!Object.hasOwn(ORDER_TRANSITIONS, status)) {
    return res.status(400).json({ message: "Unknown status" });
  }

  const order = await Order.findByPk(id, { include: [{ model: OrderItem, as: "items" }] });
  if (!order) return res.status(404).json({ message: "Order not found" });

  if (!ORDER_TRANSITIONS[order.status]?.includes(status)) {
    return res.status(400).json({
      message: `Invalid transition: cannot move from ${order.status} to ${status}`,
    });
  }

  // Unpaid orders can only be cancelled, never cooked
  if (order.payment_status !== "paid" && status !== "cancelled") {
    return res.status(400).json({ message: "Order has not been paid yet" });
  }

  // Cancelling a paid order gives the money back first; if the refund fails, nothing changes
  if (status === "cancelled" && order.payment_status === "paid") {
    try {
      await refundOrder(order);
    } catch (err) {
      console.error(`❌ Refund failed for order ${order.id}:`, describeRazorpayError(err));
      return res.status(502).json({ message: "Refund failed, so the order was not cancelled. Please try again." });
    }
  }

  await order.update({ status });
  await OrderEvent.create({
    order_id: order.id,
    event_type: "status_update",
    payload: { newStatus: status, updatedBy: req.user.id },
  });

  // Notify the customer who placed the order
  if (order.customer_id) {
    io.to(userRoom(order.customer_id)).emit("orderStatusUpdated", { orderId: order.id, status });
  }

  // Notify kitchen staff dashboards
  io.to("kitchen").emit("orderStatusUpdated", { orderId: order.id, status });

  res.json({ message: `Order status updated to ${status}`, order });
};

// ===================== GET ORDER BY ID =====================
export const getOrderById = async (req, res) => {
  const id = parseId(req.params.id);
  const order =
    id &&
    (await Order.findByPk(id, {
      include: [{ model: OrderItem, as: "items" }, { model: OrderEvent, as: "events" }],
    }));

  if (!order) return res.status(404).json({ message: "Order not found" });

  // Restrict kiosk users to their own orders
  if (req.user.role === "kiosk" && order.customer_id !== req.user.id) {
    return res.status(403).json({ message: "Forbidden: not your order" });
  }

  res.json(order);
};
