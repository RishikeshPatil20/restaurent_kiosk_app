import bcrypt from "bcrypt";
import {
  sequelizeInstance,
  User,
  Menu,
  Order,
  OrderItem,
  Payment,
  Cart,
  CartItem,
} from "../src/models/index.js";

const seedDatabase = async () => {
  try {
    console.log("🌱 Starting database seeding...");

    // Drop & recreate tables
    await sequelizeInstance.sync({ force: true });
    console.log("✅ Database synced (tables created).");

    // ==================== Users ====================
    const passwordHash = await bcrypt.hash("password123", 10);

    const [adminUser, staffUser, kioskUser] = await Promise.all([
      User.create({
        email: "admin@example.com",
        password_hash: passwordHash,
        role: "admin",
      }),
      User.create({
        email: "staff@example.com",
        password_hash: passwordHash,
        role: "staff",
      }),
      User.create({
        email: "kiosk@example.com",
        password_hash: passwordHash,
        role: "kiosk",
      }),
    ]);

    console.log(
      "✅ Users created:",
      adminUser.email,
      staffUser.email,
      kioskUser.email
    );

    // ==================== Menus ====================
    const menus = await Menu.bulkCreate([
      // Vegetarian Starters
      {
        item_name: "Paneer Tikka",
        item_description: "Cottage cheese cubes marinated in spices, grilled in tandoor",
        item_price: 220,
        item_category: "Vegetarian Starters",
        available: true,
      },
      {
        item_name: "Aloo Tikki",
        item_description: "Crispy potato patties with chutneys",
        item_price: 120,
        item_category: "Vegetarian Starters",
        available: true,
      },
      {
        item_name: "Onion Bhaji",
        item_description: "Crispy onion fritters in gram flour batter",
        item_price: 100,
        item_category: "Vegetarian Starters",
        available: true,
      },
      {
        item_name: "Samosa",
        item_description: "Spiced potato & pea filling in a crisp pastry",
        item_price: 50,
        item_category: "Vegetarian Starters",
        available: true,
      },
      {
        item_name: "Vegetable Pakora",
        item_description: "Mixed vegetable fritters in spiced gram flour",
        item_price: 110,
        item_category: "Vegetarian Starters",
        available: true,
      },
      {
        item_name: "Hara Bhara Kebab",
        item_description: "Spinach, peas & potato patties with spices",
        item_price: 150,
        item_category: "Vegetarian Starters",
        available: true,
      },

      // Non-Vegetarian Starters
      {
        item_name: "Chicken Tikka",
        item_description: "Chicken pieces marinated in yogurt & spices, grilled",
        item_price: 250,
        item_category: "Non-Vegetarian Starters",
        available: true,
      },
      {
        item_name: "Tandoori Chicken",
        item_description: "Chicken marinated in spices & roasted in tandoor",
        item_price: 350,
        item_category: "Non-Vegetarian Starters",
        available: true,
      },
      {
        item_name: "Seekh Kebab",
        item_description: "Spiced minced meat skewers, grilled",
        item_price: 300,
        item_category: "Non-Vegetarian Starters",
        available: true,
      },
      {
        item_name: "Fish Amritsari",
        item_description: "Crispy batter-fried spiced fish",
        item_price: 300,
        item_category: "Non-Vegetarian Starters",
        available: true,
      },
      {
        item_name: "Chicken 65",
        item_description: "Spicy South Indian-style fried chicken bites",
        item_price: 280,
        item_category: "Non-Vegetarian Starters",
        available: true,
      },
      {
        item_name: "Prawn Fry",
        item_description: "Prawns marinated & pan-fried with spices",
        item_price: 350,
        item_category: "Non-Vegetarian Starters",
        available: true,
      },

      // Vegetarian Main Course
      {
        item_name: "Paneer Butter Masala",
        item_description: "Paneer cubes in rich creamy tomato gravy",
        item_price: 280,
        item_category: "Vegetarian Main Course",
        available: true,
      },
      {
        item_name: "Dal Makhani",
        item_description: "Slow-cooked black lentils with butter & cream",
        item_price: 220,
        item_category: "Vegetarian Main Course",
        available: true,
      },
      {
        item_name: "Chana Masala",
        item_description: "Spicy chickpea curry",
        item_price: 200,
        item_category: "Vegetarian Main Course",
        available: true,
      },
      {
        item_name: "Palak Paneer",
        item_description: "Paneer cubes in creamy spinach gravy",
        item_price: 240,
        item_category: "Vegetarian Main Course",
        available: true,
      },
      {
        item_name: "Malai Kofta",
        item_description: "Paneer & vegetable dumplings in creamy sauce",
        item_price: 260,
        item_category: "Vegetarian Main Course",
        available: true,
      },
      {
        item_name: "Aloo Gobi",
        item_description: "Potatoes & cauliflower cooked with spices",
        item_price: 180,
        item_category: "Vegetarian Main Course",
        available: true,
      },

      // Non-Vegetarian Main Course
      {
        item_name: "Butter Chicken",
        item_description: "Creamy tomato-butter gravy with tender chicken",
        item_price: 320,
        item_category: "Non-Vegetarian Main Course",
        available: true,
      },
      {
        item_name: "Chicken Curry",
        item_description: "Traditional spiced chicken curry",
        item_price: 280,
        item_category: "Non-Vegetarian Main Course",
        available: true,
      },
      {
        item_name: "Rogan Josh",
        item_description: "Aromatic Kashmiri lamb curry",
        item_price: 400,
        item_category: "Non-Vegetarian Main Course",
        available: true,
      },
      {
        item_name: "Goan Fish Curry",
        item_description: "Tangy coconut-based fish curry",
        item_price: 350,
        item_category: "Non-Vegetarian Main Course",
        available: true,
      },
      {
        item_name: "Prawn Masala",
        item_description: "Prawns cooked in thick spiced gravy",
        item_price: 370,
        item_category: "Non-Vegetarian Main Course",
        available: true,
      },
      {
        item_name: "Mutton Biryani",
        item_description: "Fragrant rice cooked with spiced mutton",
        item_price: 380,
        item_category: "Non-Vegetarian Main Course",
        available: true,
      },

      // Snacks
      {
        item_name: "French Fries",
        item_description: "Classic golden potato fries",
        item_price: 90,
        item_category: "Snacks",
        available: true,
      },
      {
        item_name: "Masala French Fries",
        item_description: "Fries tossed in Indian spices",
        item_price: 100,
        item_category: "Snacks",
        available: true,
      },
      {
        item_name: "Potato Chips",
        item_description: "Crispy potato chips with seasoning",
        item_price: 70,
        item_category: "Snacks",
        available: true,
      },
      {
        item_name: "Nachos",
        item_description: "Crispy tortilla chips with cheese & salsa",
        item_price: 150,
        item_category: "Snacks",
        available: true,
      },

      // Beverages
      {
        item_name: "Mojito",
        item_description: "Mint, lime, sugar & soda mocktail",
        item_price: 140,
        item_category: "Beverages",
        available: true,
      },
      {
        item_name: "Virgin Pina Colada",
        item_description: "Pineapple juice & coconut cream mocktail",
        item_price: 160,
        item_category: "Beverages",
        available: true,
      },
      {
        item_name: "Watermelon Cooler",
        item_description: "Fresh watermelon juice with mint",
        item_price: 130,
        item_category: "Beverages",
        available: true,
      },
      {
        item_name: "Lassi (Sweet)",
        item_description: "Traditional sweet yogurt drink",
        item_price: 100,
        item_category: "Beverages",
        available: true,
      },
      {
        item_name: "Lassi (Salted)",
        item_description: "Salted yogurt-based drink",
        item_price: 100,
        item_category: "Beverages",
        available: true,
      },
      {
        item_name: "Mango Lassi",
        item_description: "Mango-flavored yogurt drink",
        item_price: 120,
        item_category: "Beverages",
        available: true,
      },
      {
        item_name: "Chaas (Buttermilk)",
        item_description: "Light, spiced buttermilk",
        item_price: 80,
        item_category: "Beverages",
        available: true,
      },
      {
        item_name: "Fresh Lime Soda",
        item_description: "Refreshing lime soda (sweet or salted)",
        item_price: 90,
        item_category: "Beverages",
        available: true,
      },
    ]);

    console.log(
      "✅ Menus created:",
      menus.map((m) => m.item_name).join(", ")
    );

    // ==================== Example Cart ====================
    const cart = await Cart.create({
      user_id: kioskUser.id,
      status: "active",
    });

    await CartItem.bulkCreate([
      {
        cart_id: cart.id,
        menu_item_id: menus[0].id, // Paneer Tikka
        quantity: 1,
        price: menus[0].item_price,
      },
      {
        cart_id: cart.id,
        menu_item_id: menus[3].id, // Samosa
        quantity: 2,
        price: menus[3].item_price,
      },
    ]);

    console.log("✅ Example cart created for kiosk user");

    // ==================== Example Order ====================
    const order = await Order.create({
      idempotency_key: "order-12345",
      table_number: "T1",
      customer_name: "John Doe",
      customer_id: kioskUser.id,
      notes: "Extra chutney with samosa",
      order_code: 1, // first token of the day
      status: "pending",
      total_amount: 0, // will update below
      payment_status: "paid", // paid orders show up on the kitchen board
    });

    const createdItems = await OrderItem.bulkCreate([
      {
        order_id: order.id,
        menu_snapshot_name: "Paneer Tikka",
        quantity: 1,
        item_price: 220,
      },
      {
        order_id: order.id,
        menu_snapshot_name: "Samosa",
        quantity: 2,
        item_price: 50,
      },
      {
        order_id: order.id,
        menu_snapshot_name: "Mango Lassi",
        quantity: 1,
        item_price: 120,
      },
    ]);

    const computedTotal = createdItems.reduce(
      (sum, it) => sum + it.quantity * it.item_price,
      0
    );
    await order.update({ total_amount: computedTotal });

    // ==================== Example Payment ====================
    await Payment.create({
      order_id: order.id,
      amount: computedTotal,
      provider: "dummy",
      status: "success",
      transaction_id: "txn-12345",
      provider_response: { mock: "SEEDED_PAYMENT" },
    });

    console.log(
      "✅ Example order with payment created (order id:",
      order.id,
      ")"
    );

    console.log("🌱 Database seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    process.exit(1);
  }
};

seedDatabase();
