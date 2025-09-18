// backend/src/app.js
import express from "express";
import path from "path";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import expressLayouts from "express-ejs-layouts";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import menusRoutes from "./routes/menus.js";
import ordersRoutes from "./routes/orders.js";
import paymentsRoutes from "./routes/payments.js";
import viewsRoutes from "./routes/views.js";
import cartRoutes from "./routes/carts.js";
import { errorHandler } from "./middleware/errorHandler.js";
import checkoutRoutes from "./routes/checkOut.js";

dotenv.config();

const app = express();

// ---- Security & CORS ----
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  })
);

// ---- Logging ----
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// ---- Body parsing & cookies ----
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ---- Views & Layouts ----
const __dirname = path.resolve();
app.set("views", path.join(__dirname, "src", "views"));
app.set("view engine", "ejs");

// NOTE: express-ejs-layouts must be applied before routes that render views
app.use(expressLayouts);
app.set("layout", "layouts/main"); // default layout for pages that do not call layout()

// ---- Static files ----
// backend/src/app.js
app.use("/css", express.static(path.join(__dirname, "src", "public", "css")));
app.use("/js", express.static(path.join(__dirname, "src", "public", "js")));
app.use("/images", express.static(path.join(__dirname, "src", "public", "images")));

// ---- API Routes (prefixed) ----
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/menus", menusRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/cart", cartRoutes);
app.use("/checkout", checkoutRoutes);

// ---- View Routes (EJS pages) ----
app.use("/", viewsRoutes);

// ---- Health check ----
app.get("/healthz", (req, res) => res.json({ status: "ok" }));

// ---- 404 handler ----
app.use((req, res, next) => {
  // Determine if the client expects HTML or JSON
  const acceptsHtml = req.accepts && req.accepts("html");
  if (acceptsHtml) {
    return res.status(404).render("errors/404", { url: req.originalUrl, title: "Not Found" });
  }
  res.status(404).json({ message: "Not Found" });
});

// ---- Centralized error handler (must be last) ----
app.use(errorHandler);

export default app;
