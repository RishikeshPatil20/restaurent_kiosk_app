// backend/src/models/order.js
import { DataTypes } from "sequelize";
import { rupeesColumn } from "./money.js";

export default (sequelize) => {
  const Order = sequelize.define(
    "Order",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      idempotency_key: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
      },
      table_number: {
        type: DataTypes.STRING,
      },
      customer_name: {
        type: DataTypes.STRING,
      },
      customer_id: {
        type: DataTypes.INTEGER,
      },
      notes: {
        type: DataTypes.TEXT,
      },
      // Daily token number shown to customers and the kitchen (#1, #2, ... per business day).
      // Assigned when the order is paid; see services/orders.js → markOrderPaid.
      order_code: {
        type: DataTypes.INTEGER,
      },
      status: {
        type: DataTypes.ENUM(
          "pending",
          "accepted",
          "preparing",
          "ready",
          "served",
          "cancelled"
        ),
        defaultValue: "pending",
      },
      total_amount: rupeesColumn("total_amount", "total_amount_paise"),
      // ✅ NEW FIELD
      payment_status: {
        type: DataTypes.ENUM("unpaid", "paid", "failed"),
        defaultValue: "unpaid",
      },
    },
    { tableName: "orders", underscored: true }
  );

  return Order;
};
