// Money columns used to store rupees (FLOAT/DECIMAL/INTEGER); they now store integer paise
// in *_paise columns (see models/money.js). Converts any table that still has the old column.
const MONEY_COLUMNS = [
  ["menus", "item_price", "item_price_paise"],
  ["orders", "total_amount", "total_amount_paise"],
  ["order_items", "item_price", "item_price_paise"],
  ["payments", "amount", "amount_paise"],
  ["CartItems", "price", "price_paise"],
];

export const up = async ({ queryInterface, transaction }) => {
  for (const [table, oldColumn, newColumn] of MONEY_COLUMNS) {
    let columns;
    try {
      columns = await queryInterface.describeTable(table, { transaction });
    } catch {
      continue; // table does not exist yet
    }
    if (!columns[oldColumn] || columns[newColumn]) continue;

    await queryInterface.sequelize.query(
      `ALTER TABLE "${table}" ADD COLUMN "${newColumn}" INTEGER`,
      { transaction }
    );
    await queryInterface.sequelize.query(
      `UPDATE "${table}" SET "${newColumn}" = ROUND(COALESCE("${oldColumn}", 0)::numeric * 100)`,
      { transaction }
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE "${table}" ALTER COLUMN "${newColumn}" SET NOT NULL`,
      { transaction }
    );
    await queryInterface.sequelize.query(`ALTER TABLE "${table}" DROP COLUMN "${oldColumn}"`, {
      transaction,
    });
  }
};
