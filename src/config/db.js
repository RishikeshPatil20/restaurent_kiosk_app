import { Sequelize } from "sequelize";
import dotenv from "dotenv";
dotenv.config();

const dbName = process.env.DATABASE_NAME;
const userName = process.env.USER_NAME;
const password = process.env.PASSWORD;

console.log("DBNAME:", dbName, "| USERNAME:", userName);

const sequelizeInstance = new Sequelize(dbName, userName, password, {
  host: "localhost",
  dialect: "postgres",
  logging: false,
});

(async () => {
  try {
    await sequelizeInstance.authenticate();
    console.log("✅ Connection to PostgreSQL has been established successfully");
  } catch (error) {
    console.error("❌ Unable to connect to database:", error);
  }
})();

export default sequelizeInstance;
