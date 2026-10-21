import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { User } from "../models/index.js";
import { wantsJson } from "../utils/request.js";
dotenv.config();

const readToken = (req) =>
  req.cookies?.token ||
  (req.headers.authorization && req.headers.authorization.split(" ")[1]);

const unauthorized = (req, res) => {
  res.clearCookie("token");
  if (wantsJson(req)) {
    return res.status(401).json({ message: "Authentication required" });
  }
  return res.redirect("/login");
};

export const authenticateJWT = async (req, res, next) => {
  const token = readToken(req);
  if (!token) return unauthorized(req, res);

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.SECRET_KEY);
  } catch {
    return unauthorized(req, res);
  }

  // Re-check the user so deleted accounts and role changes take effect immediately
  const user = await User.findByPk(decoded.id, { attributes: ["id", "email", "role"] });
  if (!user) return unauthorized(req, res);

  req.user = { id: user.id, email: user.email, role: user.role };
  res.locals.user = req.user;
  next();
};

// Non-blocking: exposes the logged-in user (if any) to views for the header/nav
export const attachUser = (req, res, next) => {
  const token = readToken(req);
  if (token) {
    try {
      const { id, role } = jwt.verify(token, process.env.SECRET_KEY);
      res.locals.user = { id, role };
    } catch {
      // invalid/expired token: treat as logged out
    }
  }
  next();
};
