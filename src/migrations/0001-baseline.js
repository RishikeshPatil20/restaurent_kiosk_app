// Creates any missing tables from the current models (existing tables are left untouched).
export const up = async ({ sequelize }) => {
  await sequelize.sync();
};
