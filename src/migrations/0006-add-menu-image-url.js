// Menu items get a photo (image_url). Existing dishes are matched to the bundled photos by name.
import { menuImageCredits } from "../utils/menuImages.js";

export const up = async ({ queryInterface, transaction }) => {
  let columns;
  try {
    columns = await queryInterface.describeTable("menus", { transaction });
  } catch {
    return; // table does not exist yet
  }

  if (!columns.image_url) {
    await queryInterface.sequelize.query(`ALTER TABLE "menus" ADD COLUMN "image_url" VARCHAR(255)`, {
      transaction,
    });
  }

  for (const { item, image } of menuImageCredits) {
    await queryInterface.sequelize.query(
      `UPDATE "menus" SET "image_url" = :image WHERE "item_name" = :item AND "image_url" IS NULL`,
      { replacements: { image, item }, transaction }
    );
  }
};
