import { DataTypes } from "sequelize";
import { rupeesColumn } from "./money.js";

export default (sequelize) => {
  const Payment = sequelize.define(
    "Payment",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      order_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      amount: rupeesColumn("amount", "amount_paise"),
      provider: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "dummy",
      },
      status: {
        type: DataTypes.ENUM("initiated", "success", "failed", "refunded"),
        defaultValue: "initiated",
      },
      transaction_id: {
        type: DataTypes.STRING,
        unique: true,
      },
      upi_id: {
        type: DataTypes.STRING,
      },
      provider_response: {
        type: DataTypes.JSONB,
      },
    },
    { tableName: "payments", underscored: true }
  );

  return Payment;
};
