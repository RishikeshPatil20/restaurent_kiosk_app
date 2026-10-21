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
import { attachUser } from "./middleware/jwtAuthMiddleware.js";
import checkoutRoutes from "./routes/checkOut.js";
import { wantsJson } from "./utils/request.js";
import { formatRupees } from "./models/money.js";

dotenv.config();

const app = express();
const isProd = process.env.NODE_ENV === "production";

// ---- Security & CORS ----
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        // Razorpay Checkout loads scripts, frames and images from several *.razorpay.com hosts
        "script-src": ["'self'", "https://cdn.jsdelivr.net", "https://*.razorpay.com"],
        "frame-src": ["'self'", "https://*.razorpay.com"],
        "connect-src": ["'self'", "https://*.razorpay.com"],
        "img-src": ["'self'", "data:", "https://*.razorpay.com"],
        // Card/netbanking auth: Checkout opens an about:blank popup (which inherits this policy)
        // and submits a form from it to api.razorpay.com
        "form-action": ["'self'", "https://*.razorpay.com"],
        // Kiosks on the LAN are served over plain HTTP in development
        "upgrade-insecure-requests": isProd ? [] : null,
      },
    },
    // The default "same-origin" cuts the link between Checkout and its bank popup,
    // so Razorpay never receives the authentication result and fails the payment
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  })
);

// The UI is served from this same origin; only enable CORS for explicitly listed origins
export const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : false;
app.use(cors({ origin: corsOrigins, credentials: true }));

// ---- Logging ----
if (!isProd) {
  app.use(morgan("dev"));
}

// ---- Body parsing & cookies ----
app.use(
  express.json({
    limit: "2mb",
    // Razorpay webhook signatures are computed over the exact raw bytes
    verify: (req, res, buf) => {
      if (req.originalUrl === "/api/payments/webhook") req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ---- Views & Layouts ----
const __dirname = path.resolve();
app.set("views", path.join(__dirname, "src", "views"));
app.set("view engine", "ejs");

// NOTE: express-ejs-layouts must be applied before routes that render views
app.use(expressLayouts);
app.set("layout", "layouts/main"); // default layout for pages that do not call layout()
app.locals.formatRupees = formatRupees;

// ---- Static files ----
app.use(express.static(path.join(__dirname, "src", "public")));

// Make the logged-in user (if any) available to the header on every page
app.use(attachUser);

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
app.use((req, res) => {
  if (wantsJson(req)) {
    return res.status(404).json({ message: "Not Found" });
  }
  res.status(404).render("errors/404", { url: req.originalUrl, title: "Not Found" });
});

// ---- Centralized error handler (must be last) ----
app.use(errorHandler);

export default app;
