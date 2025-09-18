// backend/src/models/order.js
import { DataTypes } from "sequelize";

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
      total_amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
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
