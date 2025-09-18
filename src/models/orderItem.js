import { DataTypes } from "sequelize";

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
      item_price: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    { tableName: "order_items", underscored: true }
  );

  return OrderItem;
};
