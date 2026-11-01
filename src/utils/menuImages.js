// backend/src/utils/menuImages.js
// Menu photos live in public/images/menu (640x480 JPEGs from Wikimedia Commons).
// credits.json maps each seeded dish to its photo and records author/license for the credits page.
import fs from "fs";
import { fileURLToPath } from "url";

const creditsFile = fileURLToPath(new URL("../public/images/menu/credits.json", import.meta.url));

export const menuImageCredits = JSON.parse(fs.readFileSync(creditsFile, "utf8"));

const imageByItem = new Map(menuImageCredits.map((c) => [c.item, c.image]));

export const menuImageFor = (itemName) => imageByItem.get(itemName) ?? null;

// The CSP only allows images from this site, so menu images must be local paths
export const isValidMenuImageUrl = (value) =>
  value === null || (typeof value === "string" && /^\/images\/[\w\-/.]+\.(jpe?g|png|webp)$/i.test(value));
