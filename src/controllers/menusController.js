import { Menu } from "../models/index.js";
import { parseId } from "../utils/request.js";

const MENU_ATTRIBUTES = ["id", "item_name", "item_description", "item_price", "item_category", "available"];

const isValidPrice = (price) => {
  const value = Number(price);
  return Number.isFinite(value) && value > 0;
};

// get available menus
export const getMenusForEjs = () =>
  Menu.findAll({
    where: { available: true },
    attributes: MENU_ATTRIBUTES,
    order: [
      ["item_category", "ASC"],
      ["id", "ASC"],
    ],
  });

export const getMenus = async (req, res) => {
  res.json(await getMenusForEjs());
};

// get single menu
export const getMenuById = async (req, res) => {
  const id = parseId(req.params.id);
  const menu = id && (await Menu.findByPk(id));
  if (!menu || !menu.available) {
    return res.status(404).json({ message: "Menu item not found or unavailable" });
  }
  res.json(menu);
};

export const createMenu = async (req, res) => {
  const { item_name, item_description, item_price, item_category, available } = req.body;
  if (!item_name || !item_category || !isValidPrice(item_price)) {
    return res
      .status(400)
      .json({ message: "Name, category and a positive price are required" });
  }

  const newMenu = await Menu.create({
    item_name,
    item_description,
    item_price,
    item_category,
    available: available ?? true,
  });

  res.status(201).json({ message: "Menu item created successfully", menu: newMenu });
};

// only admin can update this menu
export const updateMenu = async (req, res) => {
  const id = parseId(req.params.id);
  const menu = id && (await Menu.findByPk(id));
  if (!menu) return res.status(404).json({ message: "Menu item not found" });

  const { item_name, item_description, item_price, item_category, available } = req.body;
  if (item_price !== undefined && !isValidPrice(item_price)) {
    return res.status(400).json({ message: "Price must be a positive number" });
  }

  await menu.update({
    item_name: item_name ?? menu.item_name,
    item_description: item_description ?? menu.item_description,
    item_price: item_price ?? menu.item_price,
    item_category: item_category ?? menu.item_category,
    available: available ?? menu.available,
  });

  res.json({ message: "Menu item updated successfully", menu });
};

// admin or staff has toggle availability
export const toggleAvailability = async (req, res) => {
  const id = parseId(req.params.id);
  const menu = id && (await Menu.findByPk(id));
  if (!menu) return res.status(404).json({ message: "Menu item not found" });

  const { available } = req.body;
  if (typeof available !== "boolean") {
    return res.status(400).json({ message: "available must be true or false" });
  }

  await menu.update({ available });

  res.json({ message: `Menu item availability updated to ${available}`, menu });
};

// admin can delete menu (soft delete)
export const deleteMenu = async (req, res) => {
  const id = parseId(req.params.id);
  const menu = id && (await Menu.findByPk(id));
  if (!menu) return res.status(404).json({ message: "Menu item not found" });

  await menu.update({ available: false });

  res.json({ message: "Menu item marked as unavailable (soft deleted)" });
};

// admin can get all menus including unavailable
export const getAllMenusAdmin = async (req, res) => {
  const menus = await Menu.findAll({
    attributes: MENU_ATTRIBUTES,
    order: [
      ["item_category", "ASC"],
      ["id", "ASC"],
    ],
  });
  res.json(menus);
};
