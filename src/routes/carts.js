import express from "express";
import { authenticateJWT } from "../middleware/jwtAuthMiddleware.js";
import {
  addToCart,
  getCart,
  removeFromCart,updateQuantity ,
  clearCart
} from "../controllers/cartController.js";

const cartRoutes = express.Router();

cartRoutes.use(authenticateJWT);

cartRoutes.get("/", getCart); // get current cart
cartRoutes.post("/add", addToCart); // add item
cartRoutes.patch("/update/:id", updateQuantity); // PATCH for updating qty
cartRoutes.delete("/remove/:id", removeFromCart); // remove item by cartItemId
cartRoutes.delete("/clear", clearCart); // empty cart

export default cartRoutes;
