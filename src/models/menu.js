import { DataTypes } from "sequelize";
import { rupeesColumn } from "./money.js";

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
      item_price: rupeesColumn("item_price", "item_price_paise"),
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
