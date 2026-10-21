// backend/src/migrate.js
// Runs pending migrations from src/migrations in filename order, recording each one in
// the schema_migrations table. Every migration is written to be safe to re-run.
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { sequelizeInstance } from "./models/index.js";

const migrationsDir = path.join(path.resolve(), "src", "migrations");

const run = async () => {
  const qi = sequelizeInstance.getQueryInterface();
  await sequelizeInstance.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(255) PRIMARY KEY)'
  );

  const [rows] = await sequelizeInstance.query("SELECT name FROM schema_migrations");
  const applied = new Set(rows.map((r) => r.name));

  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".js")).sort();
  for (const file of files) {
    if (applied.has(file)) continue;

    const { up } = await import(pathToFileURL(path.join(migrationsDir, file)).href);
    console.log(`▶ Running ${file}`);
    await sequelizeInstance.transaction(async (transaction) => {
      await up({ sequelize: sequelizeInstance, queryInterface: qi, transaction });
      await sequelizeInstance.query("INSERT INTO schema_migrations (name) VALUES (:name)", {
        replacements: { name: file },
        transaction,
      });
    });
  }

  console.log("✅ Migrations up to date");
};

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  });
