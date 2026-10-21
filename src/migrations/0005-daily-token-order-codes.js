// order_code becomes a daily token number (#1, #2, ... per business day) assigned at payment.
// Renumber existing paid orders that way and clear codes on unpaid orders.
export const up = async ({ queryInterface, transaction }) => {
  const tz = process.env.BUSINESS_TIMEZONE || "Asia/Kolkata";

  await queryInterface.sequelize.query(
    `UPDATE "orders" SET "order_code" = NULL WHERE "payment_status" <> 'paid'`,
    { transaction }
  );
  await queryInterface.sequelize.query(
    `UPDATE "orders" o
        SET "order_code" = t.seq
       FROM (
         SELECT "id",
                ROW_NUMBER() OVER (
                  PARTITION BY ("created_at" AT TIME ZONE :tz)::date
                  ORDER BY "created_at", "id"
                ) AS seq
           FROM "orders"
          WHERE "payment_status" = 'paid'
       ) t
      WHERE o."id" = t."id"`,
    { replacements: { tz }, transaction }
  );
};
