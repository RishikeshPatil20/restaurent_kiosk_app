import { Cart, CartItem, Menu } from "../models/index.js";
import { parseId } from "../utils/request.js";

const MAX_QUANTITY = 50;

const findActiveCart = (userId) =>
  Cart.findOne({ where: { user_id: userId, status: "active" } });

// Cart item lookup restricted to the caller's own active cart
const findOwnCartItem = (itemId, userId) =>
  CartItem.findOne({
    where: { id: itemId },
    include: [
      { model: Cart, as: "cart", where: { user_id: userId, status: "active" }, attributes: [] },
    ],
  });

export const getCart = async (req, res) => {
  let cart = await Cart.findOne({
    where: { user_id: req.user.id, status: "active" },
    include: [
      {
        model: CartItem,
        as: "items",
        include: [{ model: Menu, as: "menu" }], // ✅ menu details
      },
    ],
    order: [[{ model: CartItem, as: "items" }, "id", "ASC"]],
  });

  if (!cart) {
    cart = await Cart.create({ user_id: req.user.id });
    cart.setDataValue("items", []);
  }

  res.json(cart);
};

export const addToCart = async (req, res) => {
  const menuItemId = parseId(req.body.menu_item_id);
  if (!menuItemId) {
    return res.status(400).json({ message: "A valid menu_item_id is required" });
  }

  // Price always comes from the menu, never from the client
  const menu = await Menu.findByPk(menuItemId);
  if (!menu || !menu.available) {
    return res.status(404).json({ message: "This item is not available" });
  }

  let cart = await findActiveCart(req.user.id);
  if (!cart) {
    cart = await Cart.create({ user_id: req.user.id });
  }

  let item = await CartItem.findOne({
    where: { cart_id: cart.id, menu_item_id: menu.id },
  });

  if (item) {
    if (item.quantity >= MAX_QUANTITY) {
      return res.status(400).json({ message: `Maximum quantity is ${MAX_QUANTITY}` });
    }
    item.quantity += 1;
    item.price = menu.item_price;
    await item.save();
  } else {
    item = await CartItem.create({
      cart_id: cart.id,
      menu_item_id: menu.id,
      price: menu.item_price,
      quantity: 1,
    });
  }

  res.json({ message: "Item added to cart", item });
};

export const removeFromCart = async (req, res) => {
  const id = parseId(req.params.id);
  const item = id && (await findOwnCartItem(id, req.user.id));
  if (!item) {
    return res.status(404).json({ message: "Item not found" });
  }

  await item.destroy();
  res.json({ message: "Item removed" });
};

export const updateQuantity = async (req, res) => {
  const id = parseId(req.params.id); // cartItemId
  const quantity = Number(req.body.quantity);

  if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_QUANTITY) {
    return res
      .status(400)
      .json({ message: `Quantity must be a whole number between 0 and ${MAX_QUANTITY}` });
  }

  const item = id && (await findOwnCartItem(id, req.user.id));
  if (!item) {
    return res.status(404).json({ message: "Item not found" });
  }

  if (quantity === 0) {
    await item.destroy();
    return res.json({ message: "Item removed" });
  }

  item.quantity = quantity;
  await item.save();

  res.json({ message: "Quantity updated", item });
};

export const clearCart = async (req, res) => {
  const cart = await findActiveCart(req.user.id);
  if (cart) {
    await CartItem.destroy({ where: { cart_id: cart.id } });
  }
  res.json({ message: "Cart cleared" });
};
