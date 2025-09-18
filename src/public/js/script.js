// This will fail if script is above button
// because button is not yet parsed
// document.getElementById("myBtn").addEventListener("click", () => console.log("clicked"));
// This will always work as first we are loading Dom by - DOMContentLoaded
// this is for index.js
// public/js/script.js
// public/js/script.js
document.addEventListener("DOMContentLoaded", () => {
  console.log("📱 [CLIENT] Kiosk page loaded...");

  const buttons = document.querySelectorAll(".category-btn");
  const itemsContainer = document.querySelector("#items-container");
  const cartList = document.getElementById("cart-items");
  const cartCount = document.getElementById("cart-count");
  const cartTotal = document.getElementById("cart-total");

  // === Refresh Cart from Server ===
  async function refreshCart() {
    try {
      const res = await fetch("/api/cart");
      const cart = await res.json();

      cartList.innerHTML = "";
      let totalItems = 0;
      let totalPrice = 0;

      if (cart && cart.items) {
        cart.items.forEach((item) => {
          totalItems += item.quantity;
          totalPrice += item.price * item.quantity;

          const li = document.createElement("li");
          li.className =
            "list-group-item d-flex justify-content-between align-items-center";

          li.innerHTML = `
            <div>
              ${item.menu?.item_name || "Unknown Item"}
              <div class="btn-group ms-2">
                <button class="btn btn-sm btn-outline-secondary decrease-qty"
                  data-id="${item.id}" data-qty="${item.quantity}">➖</button>
                <span class="px-2">${item.quantity}</span>
                <button class="btn btn-sm btn-outline-secondary increase-qty"
                  data-id="${item.id}" data-qty="${item.quantity}">➕</button>
                <button class="btn btn-sm btn-outline-danger remove-item"
                  data-id="${item.id}">❌</button>
              </div>
            </div>
            <span class="fw-bold">₹${item.price * item.quantity}</span>
          `;

          cartList.appendChild(li);
        });
      }

      cartCount.textContent = totalItems;
      cartTotal.textContent = `₹${totalPrice}`;
    } catch (err) {
      console.error("❌ [CLIENT] Error refreshing cart:", err);
    }
  }

  // === Handle category filter ===
  buttons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const category = btn.dataset.category;
      try {
        const res = await fetch(`/menus/${category}`);
        const items = await res.json();

        itemsContainer.innerHTML = "";

        items.forEach((item) => {
          const card = document.createElement("div");
          card.classList.add("col-md-6", "mb-3", "menu-item");
          card.setAttribute("data-category", item.item_category);
          card.innerHTML = `
            <div class="card h-100 shadow-sm p-3 d-flex flex-column">
              <h6>${item.item_name}</h6>
              <p class="mb-1 text-muted">${item.item_description}</p>
              <p class="fw-bold">₹${item.item_price}</p>
              <button class="btn btn-sm btn-outline-danger mt-auto add-to-cart"
                data-id="${item.id}"
                data-price="${item.item_price}">
                ➕ Add to Cart
              </button>
            </div>
          `;
          itemsContainer.appendChild(card);
        });
      } catch (err) {
        console.error("❌ [CLIENT] Error fetching menus:", err);
      }
    });
  });

  // === Global handler for Cart Controls ===
  document.addEventListener("click", async (e) => {
    if (e.target.classList.contains("add-to-cart")) {
      const id = e.target.dataset.id;
      const price = e.target.dataset.price;
      try {
        await fetch("/api/cart/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ menu_item_id: id, price }),
        });
        refreshCart();
      } catch (err) {
        console.error("❌ [CLIENT] Error adding to cart:", err);
      }
    }

    if (e.target.classList.contains("increase-qty")) {
      const id = e.target.dataset.id;
      const currentQty = parseInt(e.target.dataset.qty);
      try {
        await fetch(`/api/cart/update/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity: currentQty + 1 }),
        });
        refreshCart();
      } catch (err) {
        console.error("❌ [CLIENT] Error increasing qty:", err);
      }
    }

    if (e.target.classList.contains("decrease-qty")) {
      const id = e.target.dataset.id;
      const currentQty = parseInt(e.target.dataset.qty);
      try {
        await fetch(`/api/cart/update/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity: currentQty - 1 }),
        });
        refreshCart();
      } catch (err) {
        console.error("❌ [CLIENT] Error decreasing qty:", err);
      }
    }

    if (e.target.classList.contains("remove-item")) {
      const id = e.target.dataset.id;
      try {
        await fetch(`/api/cart/remove/${id}`, { method: "DELETE" });
        refreshCart();
      } catch (err) {
        console.error("❌ [CLIENT] Error removing item:", err);
      }
    }
  });

  // === Payment Handling ===
  if (document.getElementById("razorpay-container")) {
    const razorpayKey =
      document.getElementById("razorpay-container").dataset.key;
    const razorpayOrderId =
      document.getElementById("razorpay-container").dataset.orderid;
    const amount = document.getElementById("razorpay-container").dataset.amount;
    const currency =
      document.getElementById("razorpay-container").dataset.currency;

    if (razorpayKey) {
      const options = {
        key: razorpayKey,
        amount: amount,
        currency: currency,
        name: "Restaurant Kiosk",
        description: "Order Payment",
        order_id: razorpayOrderId,
        handler: function (response) {
          fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          })
            .then((res) => res.json())
            .then(() => {
              window.location.href = "/";
            })
            .catch(() => {
              alert("❌ Payment verification failed.");
            });
        },
        theme: { color: "#dc3545" },
      };
      const rzp = new Razorpay(options);
      rzp.open();
    }
  }

  // === Live Order Status Updates ===
  try {
    const socket = io();
    socket.emit("joinRoom", { role: "kiosk" });

    socket.on("orderStatusUpdated", ({ orderId, status }) => {
      console.log(`📡 [CLIENT] Kiosk got update: Order #${orderId} → ${status}`);

      const tracker = document.querySelector(`#tracker-${orderId}`);
      if (!tracker) {
        console.warn(`⚠️ [CLIENT] Tracker not found for order #${orderId}`);
        return;
      }

      const steps = [
        "pending",
        "accepted",
        "preparing",
        "ready",
        "served",
        "cancelled",
      ];
      const lis = tracker.querySelectorAll("li");

      lis.forEach((li) => {
        li.classList.remove("completed", "cancelled");
        const step = li.getAttribute("data-step");

        if (status === "cancelled" && step === "cancelled") {
          li.classList.add("cancelled");
        } else if (
          status !== "cancelled" &&
          steps.indexOf(step) <= steps.indexOf(status)
        ) {
          li.classList.add("completed");
        }
      });
    });
  } catch (err) {
    console.error("❌ [CLIENT] Socket.io not connected:", err);
  }

  refreshCart();
});
