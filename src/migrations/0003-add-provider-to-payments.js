// Records which payment provider (razorpay / dummy) handled each payment.
export const up = async ({ queryInterface, transaction }) => {
  let columns;
  try {
    columns = await queryInterface.describeTable("payments", { transaction });
  } catch {
    return; // table does not exist yet
  }
  if (columns.provider) return;

  await queryInterface.sequelize.query(
    `ALTER TABLE "payments" ADD COLUMN "provider" VARCHAR(255) NOT NULL DEFAULT 'dummy'`,
    { transaction }
  );
};
