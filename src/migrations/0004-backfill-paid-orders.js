// Before the payment fix, dummy checkouts recorded a successful payment but never marked
// the order itself as paid. Mark those orders paid so they reach the kitchen board.
export const up = async ({ queryInterface, transaction }) => {
  await queryInterface.sequelize.query(
    `UPDATE "orders" o
        SET "payment_status" = 'paid'
      WHERE o."payment_status" <> 'paid'
        AND EXISTS (
          SELECT 1 FROM "payments" p
           WHERE p."order_id" = o."id" AND p."status" = 'success'
        )`,
    { transaction }
  );
};
