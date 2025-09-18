// backend/src/models/index.js
import sequelizeInstance from "../config/db.js";

// ================= Import Model Factories =================
import UserModel from "./user.js";
import MenuModel from "./menu.js";
import OrderModel from "./order.js";
import OrderItemModel from "./orderItem.js";
import OrderEventModel from "./orderEvent.js";
import PaymentModel from "./payment.js";
import CartModel from "./cart.js";
import CartItemModel from "./cartItem.js";

// ================= Initialize Models =================
const User = UserModel(sequelizeInstance);
const Menu = MenuModel(sequelizeInstance);
const Order = OrderModel(sequelizeInstance);
const OrderItem = OrderItemModel(sequelizeInstance);
const OrderEvent = OrderEventModel(sequelizeInstance);
const Payment = PaymentModel(sequelizeInstance);
const Cart = CartModel(sequelizeInstance);
const CartItem = CartItemModel(sequelizeInstance);

// ================= Associations =================

// 🛒 Orders & Items
Order.hasMany(OrderItem, { foreignKey: "order_id", as: "items" });
OrderItem.belongsTo(Order, { foreignKey: "order_id", as: "order" });

// 🍽️ Menus ↔ OrderItems
Menu.hasMany(OrderItem, { foreignKey: "menu_id", as: "orderItems" });
OrderItem.belongsTo(Menu, { foreignKey: "menu_id", as: "menu" });

// 🍽️ Menus ↔ Orders (through OrderItem)
Order.belongsToMany(Menu, {
  through: OrderItem,
  foreignKey: "order_id",
  otherKey: "menu_id",
  as: "menus",
});
Menu.belongsToMany(Order, {
  through: OrderItem,
  foreignKey: "menu_id",
  otherKey: "order_id",
  as: "orders",
});

// 📜 Order ↔ Events
Order.hasMany(OrderEvent, { foreignKey: "order_id", as: "events" });
OrderEvent.belongsTo(Order, { foreignKey: "order_id", as: "order" });

// 💳 Order ↔ Payments
Order.hasMany(Payment, { foreignKey: "order_id", as: "payments" });
Payment.belongsTo(Order, { foreignKey: "order_id", as: "order" });

// 🛒 Cart ↔ Items
Cart.hasMany(CartItem, { foreignKey: "cart_id", as: "items" });
CartItem.belongsTo(Cart, { foreignKey: "cart_id", as: "cart" });
CartItem.belongsTo(Menu, { foreignKey: "menu_item_id", as: "menu" });

// ================= Export =================
export {
  sequelizeInstance,
  User,
  Menu,
  Order,
  OrderItem,
  OrderEvent,
  Payment,
  Cart,
  CartItem,
};
