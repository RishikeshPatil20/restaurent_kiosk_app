import { Order, OrderItem, OrderEvent, Menu } from "../models/index.js";

// ===================== CREATE ORDER =====================
export const createOrder = async (req, res) => {
  try {
    const { idempotency_key, table_number, customer_name, items, notes } = req.body;
    const io = req.app.get("io"); // socket.io instance

    if (!idempotency_key || !items || items.length === 0) {
      return res.status(400).json({ message: "Idempotency key and items are required" });
    }

    // Check idempotency
    const existing = await Order.findOne({ where: { idempotency_key } });
    if (existing) {
      return res.status(200).json({ message: "Order already created", order: existing });
    }

    // Calculate total amount + prepare orderItems
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const menu = await Menu.findByPk(item.menu_id);
      if (!menu || !menu.available) {
        return res.status(400).json({ message: `Menu item ${item.menu_id} unavailable` });
      }
      totalAmount += menu.item_price * item.quantity;
      orderItems.push({
        menu_snapshot_name: menu.item_name,
        quantity: item.quantity,
        item_price: menu.item_price,
      });
    }

    // Create order + items + initial event
    const order = await Order.create(
      {
        idempotency_key,
        table_number,
        customer_name,
        customer_id: req.user?.id ?? null,
        notes,
        order_code: Math.floor(100000 + Math.random() * 900000),
        status: "pending",
        total_amount: totalAmount,
        items: orderItems,
        events: [{ event_type: "created", payload: { by: req.user?.id || "guest" } }],
      },
      {
        include: [{ model: OrderItem, as: "items" }, { model: OrderEvent, as: "events" }],
      }
    );

    // 🔑 Convert to plain object with items (safe for socket)
    const plainOrder = {
      id: order.id,
      table_number: order.table_number,
      customer_name: order.customer_name,
      total_amount: order.total_amount,
      status: order.status,
      items: order.items.map(i => ({
        menu_snapshot_name: i.menu_snapshot_name,
        quantity: i.quantity,
      })),
    };

    // ✅ Emit clean order to staff dashboard
    io.to("kitchen").emit("orderReceived", plainOrder);

    res.status(201).json({ message: "Order created successfully", order: plainOrder });
  } catch (err) {
    console.error("Order creation error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ===================== GET MY ORDERS =====================
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { customer_id: req.user.id },
      include: [{ model: OrderItem, as: "items" }, { model: OrderEvent, as: "events" }],
      order: [["created_at", "DESC"]],
    });

    res.json(orders);
  } catch (err) {
    console.error("Error fetching my orders:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ===================== GET ALL ORDERS (Staff/Admin) =====================
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      include: [{ model: OrderItem, as: "items" }, { model: OrderEvent, as: "events" }],
      order: [["created_at", "DESC"]],
    });

    res.json(orders);
  } catch (err) {
    console.error("Error fetching all orders:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// // ===================== UPDATE ORDER STATUS =====================
// export const updateOrderStatus = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { status } = req.body;
//     const io = req.app.get("io");

//     const order = await Order.findByPk(id, { include: [{ model: OrderItem, as: "items" }] });
//     if (!order) return res.status(404).json({ message: "Order not found" });

//     const transitions = {
//       pending: ["accepted", "cancelled"],
//       accepted: ["preparing"],
//       preparing: ["ready"],
//       ready: ["served"],
//       served: [],
//       cancelled: [],
//     };

//     if (!transitions[order.status].includes(status)) {
//       return res.status(400).json({
//         message: `Invalid transition: cannot move from ${order.status} to ${status}`,
//       });
//     }

//     await order.update({ status });
//     await OrderEvent.create({
//       order_id: order.id,
//       event_type: "status_update",
//       payload: { newStatus: status, updatedBy: req.user.id },
//     });

//     io.to("kiosk").emit("orderStatusUpdated", { orderId: order.id, status });
//     io.to("kitchen").emit("orderStatusUpdated", { orderId: order.id, status });

//     res.json({ message: `Order status updated to ${status}`, order });
//   } catch (err) {
//     console.error("Error updating order status:", err);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };
// ===================== UPDATE ORDER STATUS =====================
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const io = req.app.get("io");

    const order = await Order.findByPk(id, { include: [{ model: OrderItem, as: "items" }] });
    if (!order) return res.status(404).json({ message: "Order not found" });

    const transitions = {
      pending: ["accepted", "cancelled"],
      accepted: ["preparing"],
      preparing: ["ready"],
      ready: ["served"],
      served: [],
      cancelled: [],
    };

    if (!transitions[order.status].includes(status)) {
      return res.status(400).json({
        message: `Invalid transition: cannot move from ${order.status} to ${status}`,
      });
    }

    await order.update({ status });
    await OrderEvent.create({
      order_id: order.id,
      event_type: "status_update",
      payload: { newStatus: status, updatedBy: req.user.id },
    });

    // 🔥 Debug logs
    console.log(`🔄 [SERVER] Order #${order.id} updated → ${status}`);
    console.log(`📡 Emitting to kiosk & kitchen: orderStatusUpdated`);

    // Notify kiosk-user (customer)
    io.to("kiosk").emit("orderStatusUpdated", { orderId: order.id, status });

    // Notify kitchen staff dashboards
    io.to("kitchen").emit("orderStatusUpdated", { orderId: order.id, status });

    res.json({ message: `Order status updated to ${status}`, order });
  } catch (err) {
    console.error("Error updating order status:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ===================== GET ORDER BY ID =====================
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findByPk(id, {
      include: [{ model: OrderItem, as: "items" }, { model: OrderEvent, as: "events" }],
    });

    if (!order) return res.status(404).json({ message: "Order not found" });

    // Restrict kiosk users to their own orders
    if (req.user.role === "kiosk" && order.customer_id !== req.user.id) {
      return res.status(403).json({ message: "Forbidden: not your order" });
    }

    res.json(order);
  } catch (err) {
    console.error("Error fetching order:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
