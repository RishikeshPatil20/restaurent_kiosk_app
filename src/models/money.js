import { DataTypes } from "sequelize";

// Money is stored in the DB as integer paise (see migration 0002-money-to-integer-paise).
// The app works in rupees, so this maps a rupee attribute onto a *_paise column.
export const rupeesColumn = (attribute, field) => ({
  type: DataTypes.INTEGER,
  allowNull: false,
  field,
  get() {
    const paise = this.getDataValue(attribute);
    return paise == null ? paise : paise / 100;
  },
  set(rupees) {
    this.setDataValue(attribute, rupees == null ? rupees : toPaise(rupees));
  },
});

// Rupees -> integer paise, for totals and payment-gateway amounts
export const toPaise = (rupees) => Math.round(Number(rupees) * 100);

// Display helper: "220" for whole rupees, "59.97" otherwise
export const formatRupees = (rupees) => {
  const paise = toPaise(rupees);
  return paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2);
};
