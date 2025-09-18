import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
export const authenticateJWT = (req, res, next) => {
  const token =
    req.cookies?.token ||
    (req.headers.authorization && req.headers.authorization.split(" ")[1]);

  if (!token) {
    return res.status(401).redirect("/login");
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    req.user = decoded; // { id, role }
    next();
  } catch (error) {
    console.log("Error in authenticating -JWT",error);
    return res.status(403).redirect("/login");
  }
};
