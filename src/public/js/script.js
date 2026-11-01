// public/js/script.js
// Kiosk menu page only (loaded by views/kiosk/index.ejs)
(() => {
  const menuRoot = document.getElementById("menu-sections");
  if (!menuRoot) return;

  const searchInput = document.getElementById("menu-search");
  const categoryChips = document.querySelectorAll(".category-chip");
  const vegOnly = document.getElementById("veg-only");
  const menuEmpty = document.getElementById("menu-empty");
  const cartList = document.getElementById("cart-items");
  const cartEmpty = document.getElementById("cart-empty");
  const cartSummary = document.getElementById("cart-summary");
  const cartCount = document.getElementById("cart-count");
  const cartTotal = document.getElementById("cart-total");
  const cartError = document.getElementById("cart-error");
  const checkoutForm = document.getElementById("checkout-form");
  const checkoutButton = document.getElementById("checkout-button");
  const cartFab = document.getElementById("cart-fab");
  const fabCount = document.getElementById("cart-fab-count");
  const fabTotal = document.getElementById("cart-fab-total");
  const toast = document.getElementById("cart-toast");

  let activeCategory = "";
  let toastTimer;

  const formatRupees = (rupees) => {
    const paise = Math.round(Number(rupees) * 100);
    return paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2);
  };

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const showError = (message) => {
    cartError.textContent = message;
    cartError.classList.toggle("d-none", !message);
  };

  const showToast = (message) => {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
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

  // The cart and section anchors sit just below the sticky category bar, whatever its height
  const toolbar = document.getElementById("kiosk-toolbar");
  new ResizeObserver(() => {
    document.documentElement.style.setProperty("--kiosk-toolbar-h", `${toolbar.offsetHeight}px`);
  }).observe(toolbar);

  // ---------------- Menu filters (search + category + veg) ----------------
  // Every search term must match the start of a word, so "lassi" doesn't match "classic"
  const matchesSearch = (text, terms) => {
    const words = text.split(/[^a-z0-9]+/);
    return terms.every((term) => words.some((word) => word.startsWith(term)));
  };

  function applyFilters() {
    const terms = searchInput.value.trim().toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    let visible = 0;

    menuRoot.querySelectorAll(".menu-section").forEach((section) => {
      const inCategory = !activeCategory || section.dataset.category === activeCategory;
      let sectionVisible = 0;
      section.querySelectorAll(".menu-item").forEach((card) => {
        const show =
          inCategory &&
          (!terms.length || matchesSearch(card.dataset.search, terms)) &&
          (!vegOnly.checked || card.dataset.veg === "true");
        card.classList.toggle("d-none", !show);
        if (show) sectionVisible++;
      });
      section.classList.toggle("d-none", sectionVisible === 0);
      section.querySelector(".menu-section-count").textContent = sectionVisible;
      visible += sectionVisible;
    });

    menuEmpty.classList.toggle("d-none", visible > 0);
  }

  categoryChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      activeCategory = chip.dataset.category;
      categoryChips.forEach((c) => {
        c.classList.toggle("active", c === chip);
        c.setAttribute("aria-pressed", String(c === chip));
      });
      applyFilters();
      // Bring the menu into view if the user has scrolled past it
      if (menuRoot.getBoundingClientRect().top < 0) {
        menuRoot.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
  searchInput.addEventListener("input", applyFilters);
  vegOnly.addEventListener("change", applyFilters);

  // ---------------- Cart rendering ----------------
  const qtyButton = (className, label, text, item) => {
    const btn = el("button", `qty-btn ${className}`, text);
    btn.type = "button";
    btn.dataset.id = item.id;
    btn.dataset.qty = item.quantity;
    btn.setAttribute("aria-label", label);
    return btn;
  };

  const stepper = (item, name) => {
    const wrap = el("div", "qty-stepper");
    wrap.append(
      qtyButton("decrease-qty", `Remove one ${name}`, "−", item),
      el("span", "qty-value", String(item.quantity)),
      qtyButton("increase-qty", `Add one more ${name}`, "+", item)
    );
    return wrap;
  };

  const addButton = (menuId, name) => {
    const btn = el("button", "btn btn-add add-to-cart");
    btn.type = "button";
    btn.dataset.id = menuId;
    btn.dataset.name = name;
    btn.setAttribute("aria-label", `Add ${name} to order`);
    const plus = el("span", "", "+");
    plus.setAttribute("aria-hidden", "true");
    btn.append("Add ", plus);
    return btn;
  };

  // Menu cards show "Add" or a quantity stepper depending on what is in the cart
  function renderDishActions(cartByMenuId) {
    menuRoot.querySelectorAll(".dish-action").forEach((slot) => {
      const item = cartByMenuId.get(Number(slot.dataset.menuId));
      const name = slot.dataset.name;
      slot.replaceChildren(item ? stepper(item, name) : addButton(slot.dataset.menuId, name));
    });
  }

  function cartLine(item) {
    const name = item.menu?.item_name || "Unknown item";
    const li = el("li", "cart-line");

    if (item.menu?.image_url) {
      const img = el("img", "cart-thumb");
      img.src = item.menu.image_url;
      img.alt = "";
      img.width = 56;
      img.height = 42;
      li.append(img);
    } else {
      li.append(el("div", "cart-thumb cart-thumb-placeholder", "🍽️"));
    }

    const info = el("div", "cart-line-info");
    const title = el("div", "cart-line-name", name);
    if (item.menu && !item.menu.available) {
      title.append(el("span", "text-danger small ms-1", "(unavailable)"));
    }
    info.append(title, el("div", "cart-line-each", `₹${formatRupees(item.price)} each`), stepper(item, name));

    const side = el("div", "cart-line-side");
    side.append(el("div", "cart-line-total", `₹${formatRupees(item.price * item.quantity)}`));
    const remove = el("button", "cart-remove remove-item", "Remove");
    remove.type = "button";
    remove.dataset.id = item.id;
    remove.setAttribute("aria-label", `Remove ${name} from order`);
    side.append(remove);

    li.append(info, side);
    return li;
  }

  function renderCart(cart) {
    const items = cart?.items || [];
    let totalItems = 0;
    let totalPaise = 0;

    cartList.replaceChildren(
      ...items.map((item) => {
        totalItems += item.quantity;
        totalPaise += Math.round(item.price * 100) * item.quantity;
        return cartLine(item);
      })
    );

    const total = `₹${formatRupees(totalPaise / 100)}`;
    const hasItems = items.length > 0;
    cartCount.textContent = totalItems;
    cartTotal.textContent = total;
    cartEmpty.classList.toggle("d-none", hasItems);
    cartSummary.classList.toggle("d-none", !hasItems);
    checkoutButton.disabled = !hasItems;

    fabCount.textContent = `${totalItems} item${totalItems === 1 ? "" : "s"}`;
    fabTotal.textContent = total;
    cartFab.classList.toggle("d-none", !hasItems);

    renderDishActions(new Map(items.map((item) => [item.menu_item_id, item])));
  }

  async function refreshCart() {
    try {
      renderCart(await api("/api/cart"));
    } catch (err) {
      showError("Could not load your cart. Please refresh the page.");
      console.error("❌ [CLIENT] Error refreshing cart:", err);
    }
  }

  // Run a cart change, then re-render; the button is disabled meanwhile to avoid double clicks
  async function cartAction(target, request, successMessage) {
    target.disabled = true;
    showError("");
    try {
      await request();
      if (successMessage) showToast(successMessage);
    } catch (err) {
      showError(err.message);
      showToast(err.message);
    } finally {
      target.disabled = false;
      refreshCart();
    }
  }

  // ---------------- Cart controls (menu cards + cart panel) ----------------
  document.addEventListener("click", (e) => {
    const target = e.target.closest("button");
    if (!target) return;
    const id = target.dataset.id;
    const qty = Number(target.dataset.qty);

    if (target.classList.contains("add-to-cart")) {
      cartAction(
        target,
        () => api("/api/cart/add", { method: "POST", body: JSON.stringify({ menu_item_id: id }) }),
        `Added ${target.dataset.name} ✓`
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
    checkoutButton.textContent = "Taking you to payment…";
  });

  refreshCart();
})();
