import { Menu } from "../models/index.js";

// get available menus
export const getMenusForEjs = async() =>{
  try {
    const menus = await Menu.findAll({
      where: { available: true },
      attributes: ["id", "item_name", "item_description", "item_price", "item_category", "available"],
      order: [["item_category", "ASC"]],
    });
    console.log("Menus fetched:", menus.length);
    return menus;
  } catch (err) {
    throw err;
  }
}
export const getMenus = async (req, res) => {
  try {
    const menus = await Menu.findAll({
      where: { available: true },
      attributes: ["id", "item_name", "item_description", "item_price", "item_category", "available"],
      order: [["item_category", "ASC"]],
    });
    res.json(menus);
  } catch (error) {
    console.error("Error fetching menus:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// get single menu
export const getMenuById = async (req, res) => {
  try {
    const menu = await Menu.findByPk(req.params.id);
    if (!menu || !menu.available) {
      return res.status(404).json({ message: "Menu item not found or unavailable" });
    }
    res.json(menu);
  } catch (error) {
    console.error("Error fetching menu item:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createMenu = async (req, res) => {
  try {
    const { item_name, item_description, item_price, item_category, available } = req.body;
    if (!item_name || !item_price || !item_category) {
      return res.status(400).json({ message: "Name, price, and category are required" });
    }

    const newMenu = await Menu.create({
      item_name,
      item_description,
      item_price,
      item_category,
      available: available ?? true,
    });

    res.status(201).json({ message: "Menu item created successfully", menu: newMenu });
  } catch (error) {
    console.error("Error creating menu:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// only admin can update this menu
export const updateMenu = async (req, res) => {
  try {
    const menu = await Menu.findByPk(req.params.id);
    if (!menu) return res.status(404).json({ message: "Menu item not found" });

    const { item_name, item_description, item_price, item_category, available } = req.body;

    await menu.update({
      item_name: item_name ?? menu.item_name,
      item_description: item_description ?? menu.item_description,
      item_price: item_price ?? menu.item_price,
      item_category: item_category ?? menu.item_category,
      available: available ?? menu.available,
    });

    res.json({ message: "Menu item updated successfully", menu });
  } catch (error) {
    console.error("Error updating menu:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// admin or staff has toggle availability
export const toggleAvailability = async (req, res) => {
  try {
    const menu = await Menu.findByPk(req.params.id);
    if (!menu) return res.status(404).json({ message: "Menu item not found" });

    const { available } = req.body;
    if (typeof available !== "boolean") {
      return res.status(400).json({ message: "available must be true or false" });
    }

    await menu.update({ available });

    res.json({ message: `Menu item availability updated to ${available}`, menu });
  } catch (error) {
    console.error("Error toggling availability:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// admin can delete menu (soft delete)
export const deleteMenu = async (req, res) => {
  try {
    const menu = await Menu.findByPk(req.params.id);
    if (!menu) return res.status(404).json({ message: "Menu item not found" });

    await menu.update({ available: false });

    res.json({ message: "Menu item marked as unavailable (soft deleted)" });
  } catch (error) {
    console.error("Error deleting menu:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// admin can get all menus including unavailable
export const getAllMenusAdmin = async (req, res) => {
  try {
    const menus = await Menu.findAll({
      attributes: ["id", "item_name", "item_description", "item_price", "item_category", "available"],
      order: [["item_category", "ASC"]],
    });
    res.json(menus);
  } catch (error) {
    console.error("Error fetching all menus:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
