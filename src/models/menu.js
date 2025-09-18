import { DataTypes } from "sequelize";

export default (sequelize) => {
  const Menu = sequelize.define(
    "Menu",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      item_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      item_description: {
        type: DataTypes.TEXT,
      },
      item_price: {
        type: DataTypes.INTEGER, // was NUMBER, fixed
        allowNull: false,
      },
      item_category: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      available: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    { tableName: "menus", underscored: true }
  );

  return Menu;
};
