# 🍽️ Restaurant Kiosk App

A full-stack self-service restaurant ordering kiosk with a real-time kitchen dashboard. Customers browse the menu, add items to a cart, and pay online. Kitchen staff see new orders instantly and update their status live.

## 📸 Screenshots
<img width="1888" height="868" alt="image" src="https://github.com/user-attachments/assets/67d04179-5bf7-4504-b972-0d7c93606c9b" />

| Kiosk Menu | Cart & Checkout |
|---|---|
| <img width="1900" height="861" alt="image" src="https://github.com/user-attachments/assets/2a08ddfa-721a-4a95-9ea9-de9c8f3ea3cd" />

| Kitchen Dashboard | Admin Dashboard |
|---|---|
|<img width="1901" height="866" alt="image" src="https://github.com/user-attachments/assets/e4ec85f4-9426-4101-96d8-7564c3d72780" />|
|<img width="1900" height="861" alt="image" src="https://github.com/user-attachments/assets/9c7eea8b-9b9f-4750-b6db-fc046610f9b4" />|

## ✨ Features

- **Kiosk (customer):** browse the menu by category, manage a cart, check out, and view order history on the profile page
- **Kitchen (staff):** live order feed through Socket.IO, with status updates (pending → accepted → preparing → ready → served)
- **Admin:** dashboard, staff account creation, and user management
- **Payments:** Razorpay integration (PhonePe sandbox config included)
- **Auth:** JWT stored in cookies, bcrypt password hashing, and role-based access (`admin`, `staff`, `kiosk`)
- **Security:** Helmet, CORS, centralized error handling with custom 403/404/500 pages
- Money is stored as integer **paise** in the database to avoid floating-point rounding errors

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js (≥ 22), Express 5 |
| Database | PostgreSQL + Sequelize ORM |
| Views | EJS + express-ejs-layouts |
| Real-time | Socket.IO |
| Auth | JSON Web Tokens, bcrypt |
| Payments | Razorpay |

## 📁 Project Structure

```
src/
├── config/        # DB connection, payment config
├── controllers/   # Business logic (auth, cart, orders, payments, admin)
├── middleware/    # JWT auth, role checks, error handler
├── models/        # Sequelize models
├── routes/        # API and page routes
├── sockets/       # Socket.IO kitchen/kiosk rooms
├── views/         # EJS templates (kiosk, kitchen, admin, auth, errors)
├── public/        # CSS, client JS, images
├── seed.js        # Creates tables + sample data
├── app.js         # Express app setup
└── server.js      # Entry point (HTTP + Socket.IO)
```

## 🚀 Getting Started

### Prerequisites
- Node.js 22 or newer
- PostgreSQL

### 1. Clone and install
```bash
git clone https://github.com/RishikeshPatil20/restaurent_kiosk_app.git
cd restaurent_kiosk_app
npm install
```

### 2. Create the database
```sql
CREATE DATABASE restaurent_kiosk;
```

### 3. Configure environment variables
Create a `.env` file in the project root:
```env
DATABASE_NAME=restaurent_kiosk
USER_NAME=postgres
PASSWORD=your_db_password
DB_PORT=5432

SECRET_KEY=your_jwt_secret
BASE_URL=http://localhost:5000

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Optional – PhonePe sandbox
PHONEPE_MERCHANT_ID=
PHONEPE_SALT_KEY=
PHONEPE_SALT_INDEX=1
PHONEPE_BASE_URL=https://api-preprod.phonepe.com/apis/pg-sandbox
```

### 4. Seed the database
> ⚠️ This **drops and recreates all tables**.
```bash
node src/seed.js
```

### 5. Run the app
```bash
npm run dev     # development (nodemon)
npm start       # production
```
Open **http://localhost:5000**

## 🔑 Demo Accounts (after seeding)

| Role | Email | Password |
|---|---|---|
| Admin | admin@example.com | password123 |
| Staff | staff@example.com | password123 |
| Kiosk | kiosk@example.com | password123 |

## 🔌 API Overview

| Base route | Purpose |
|---|---|
| `/api/auth` | Register, login, logout, profile |
| `/api/menus` | List, view, create, and update menu items |
| `/api/cart` | Get cart, add, update, remove, clear |
| `/checkout` | Place an order from the cart |
| `/api/orders` | Create orders, view my orders, update status |
| `/api/payments` | Initiate and verify payments |
| `/api/admin` | Dashboard, user management, staff creation |

**Socket.IO events:** `orderReceived`, `orderStatusUpdated`, `paymentStatusUpdated`

## 👤 Author

**Rishikesh Patil** – [GitHub](https://github.com/RishikeshPatil20)
