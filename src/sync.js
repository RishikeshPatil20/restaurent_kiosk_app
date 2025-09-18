import { sequelizeInstance } from "./models/index.js";

const syncDatabase = async () => {
  try {
    console.log(" Syncing database...");
    // { force: true } → Drops all tables and recreates them (useful in dev).
    // { alter: true } → Updates tables to match models without losing data (safer for development).
    // { force: true } will DROP tables and recreate them
    // use { alter: true } in production to auto-update schema without data loss
    await sequelizeInstance.sync({ alter: true });
    console.log("✅ Database synced successfully");
    process.exit(0); // exit process when done
  } catch (error) {
    console.error(" Error syncing database:", error);
    process.exit(1); // exit with failure
  }
};
syncDatabase();
