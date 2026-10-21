import { DataTypes } from "sequelize";
import { rupeesColumn } from "./money.js";

export default (sequelize) => {
  const OrderItem = sequelize.define(
    "OrderItem",
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
      menu_snapshot_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      item_price: rupeesColumn("item_price", "item_price_paise"),
    },
    { tableName: "order_items", underscored: true }
  );

  return OrderItem;
};
