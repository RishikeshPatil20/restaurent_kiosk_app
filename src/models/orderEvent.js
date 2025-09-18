import { DataTypes } from "sequelize";

export default (sequelize) => {
  const OrderEvent = sequelize.define(
    "OrderEvent",
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
      event_type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      payload: {
        type: DataTypes.JSONB,
      },
    },
    { tableName: "order_events", underscored: true }
  );

  return OrderEvent;
};
