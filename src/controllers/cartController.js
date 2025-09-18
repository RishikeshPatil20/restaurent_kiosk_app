import { Cart, CartItem, Menu } from "../models/index.js";

export const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({
      where: { user_id: req.user.id, status: "active" },
      include: [
        {
          model: CartItem,
          as: "items",
          include: [{ model: Menu, as: "menu" }], // ✅ menu details
        },
      ],
    });

    if (!cart) {
      cart = await Cart.create({ user_id: req.user.id });
    }

    res.json(cart);
  } catch (err) {
    console.error("Get cart error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const addToCart = async (req, res) => {
  try {
    const { menu_item_id, price } = req.body;
    console.log("🛒 Add-to-Cart API hit:", req.body, "User:", req.user);

    let cart = await Cart.findOne({
      where: { user_id: req.user.id, status: "active" },
    });
    if (!cart) {
      cart = await Cart.create({ user_id: req.user.id });
    }

    let item = await CartItem.findOne({
      where: { cart_id: cart.id, menu_item_id },
    });

    if (item) {
      item.quantity += 1;
      await item.save();
    } else {
      item = await CartItem.create({
        cart_id: cart.id,
        menu_item_id,
        price,
        quantity: 1,
      });
    }

    res.json({ message: "Item added to cart", item });
  } catch (err) {
    console.error("Add to cart error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const removeFromCart = async (req, res) => {
  try {
    const id = req.params.id;
    await CartItem.destroy({ where: { id } });
    res.json({ message: "Item removed" });
  } catch (err) {
    console.error("Remove from cart error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const updateQuantity = async (req, res) => {
  try {
    const { id } = req.params; // cartItemId
    const { quantity } = req.body;

    const item = await CartItem.findByPk(id, {
      include: [{ model: Menu, as: "menu" }],
    });

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    if (quantity <= 0) {
      await item.destroy();
      return res.json({ message: "Item removed" });
    }

    item.quantity = quantity;
    await item.save();

    res.json({ message: "Quantity updated", item });
  } catch (err) {
    console.error("Update quantity error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({
      where: { user_id: req.user.id, status: "active" },
    });
    if (cart) {
      await CartItem.destroy({ where: { cart_id: cart.id } });
    }
    res.json({ message: "Cart cleared" });
  } catch (err) {
    console.error("Clear cart error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
