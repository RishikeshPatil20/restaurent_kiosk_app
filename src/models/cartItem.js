import { DataTypes } from "sequelize";
import { rupeesColumn } from "./money.js";

// models/CartItem.js
export default (sequelize) => {
  const CartItem = sequelize.define("CartItem", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    cart_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    menu_item_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    price: rupeesColumn("price", "price_paise"),
  });

  return CartItem;
};
