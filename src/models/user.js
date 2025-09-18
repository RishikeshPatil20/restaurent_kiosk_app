import { DataTypes } from "sequelize";

export default (sequelizeInstance) => {
  const User = sequelizeInstance.define(
    "User",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      password_hash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM("admin", "staff", "kiosk"),
        allowNull: false,
      },
    },
    {
      tableName: "users",
      underscored: true,
    }
  );

  return User;
};

