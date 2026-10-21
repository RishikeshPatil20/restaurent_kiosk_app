// public/js/script.js
// Kiosk menu page only (loaded by views/kiosk/index.ejs)
(() => {
  const itemsContainer = document.getElementById("items-container");
  if (!itemsContainer) return;

  const categoryButtons = document.querySelectorAll(".category-btn");
  const cartList = document.getElementById("cart-items");
  const cartEmpty = document.getElementById("cart-empty");
  const cartCount = document.getElementById("cart-count");
  const cartTotal = document.getElementById("cart-total");
  const cartError = document.getElementById("cart-error");
  const checkoutForm = document.getElementById("checkout-form");
  const checkoutButton = document.getElementById("checkout-button");

  const formatRupees = (rupees) => {
    const paise = Math.round(Number(rupees) * 100);
    return paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2);
  };

  const showError = (message) => {
    cartError.textContent = message;
    cartError.classList.toggle("d-none", !message);
  };

  // JSON fetch that sends the user back to login when the session has expired
  async function api(url, options = {}) {
    const res = await fetch(url, {
      ...options,
      headers: { Accept: "application/json", "Content-Type": "application/json", ...options.headers },
    });
    if (res.status === 401) {
      window.location.href = "/login";
      throw new Error("Session expired");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
    return data;
  }

  const button = (className, label, text, item) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `btn btn-sm ${className}`;
    btn.dataset.id = item.id;
    btn.dataset.qty = item.quantity;
    btn.setAttribute("aria-label", label);
    btn.textContent = text;
    return btn;
  };

  // === Render cart from server data ===
  function renderCart(cart) {
    const items = cart?.items || [];
    let totalItems = 0;
    let totalPaise = 0;

    cartList.replaceChildren();

    items.forEach((item) => {
      totalItems += item.quantity;
      totalPaise += Math.round(item.price * 100) * item.quantity;

      const li = document.createElement("li");
      li.className = "list-group-item d-flex justify-content-between align-items-center gap-2";

      const left = document.createElement("div");
      const name = document.createElement("div");
      name.textContent = item.menu?.item_name || "Unknown Item";
      if (item.menu && !item.menu.available) {
        name.textContent += " (unavailable)";
        name.classList.add("text-danger");
      }

      const controls = document.createElement("div");
      controls.className = "btn-group btn-group-sm mt-1";
      const qty = document.createElement("span");
      qty.className = "px-2 align-self-center";
      qty.textContent = item.quantity;
      controls.append(
        button("btn-outline-secondary decrease-qty", "Decrease quantity", "➖", item),
        qty,
        button("btn-outline-secondary increase-qty", "Increase quantity", "➕", item),
        button("btn-outline-danger remove-item", "Remove item", "❌", item)
      );
      left.append(name, controls);

      const price = document.createElement("span");
      price.className = "fw-bold";
      price.textContent = `₹${formatRupees(item.price * item.quantity)}`;

      li.append(left, price);
      cartList.appendChild(li);
    });

    cartCount.textContent = totalItems;
    cartTotal.textContent = `₹${formatRupees(totalPaise / 100)}`;
    cartEmpty.classList.toggle("d-none", items.length > 0);
    checkoutButton.disabled = items.length === 0;
  }

  async function refreshCart() {
    try {
      renderCart(await api("/api/cart"));
    } catch (err) {
      showError("Could not load your cart. Please refresh the page.");
      console.error("❌ [CLIENT] Error refreshing cart:", err);
    }
  }

  // Run a cart change, then re-render; buttons are disabled meanwhile to avoid double clicks
  async function cartAction(target, request) {
    target.disabled = true;
    showError("");
    try {
      await request();
    } catch (err) {
      showError(err.message);
    } finally {
      target.disabled = false;
      refreshCart();
    }
  }

  // === Category filter (client-side; all items are already on the page) ===
  categoryButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const category = btn.dataset.category;
      categoryButtons.forEach((b) => b.classList.toggle("active", b === btn));
      itemsContainer.querySelectorAll(".menu-item").forEach((card) => {
        card.classList.toggle("d-none", Boolean(category) && card.dataset.category !== category);
      });
    });
  });

  // === Cart controls ===
  document.addEventListener("click", (e) => {
    const target = e.target.closest("button");
    if (!target) return;
    const id = target.dataset.id;
    const qty = Number(target.dataset.qty);

    if (target.classList.contains("add-to-cart")) {
      cartAction(target, () =>
        api("/api/cart/add", { method: "POST", body: JSON.stringify({ menu_item_id: id }) })
      );
    } else if (target.classList.contains("increase-qty")) {
      cartAction(target, () =>
        api(`/api/cart/update/${id}`, { method: "PATCH", body: JSON.stringify({ quantity: qty + 1 }) })
      );
    } else if (target.classList.contains("decrease-qty")) {
      cartAction(target, () =>
        api(`/api/cart/update/${id}`, { method: "PATCH", body: JSON.stringify({ quantity: qty - 1 }) })
      );
    } else if (target.classList.contains("remove-item")) {
      cartAction(target, () => api(`/api/cart/remove/${id}`, { method: "DELETE" }));
    }
  });

  // Prevent double submission of the checkout form
  checkoutForm.addEventListener("submit", () => {
    checkoutButton.disabled = true;
  });

  refreshCart();
})();
