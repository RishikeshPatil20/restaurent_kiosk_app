// public/js/kitchen.js
document.addEventListener("DOMContentLoaded", () => {
  const ordersList = document.getElementById("orders-list");
  const noOrders = document.getElementById("no-orders");

  const STEPS = ["pending", "accepted", "preparing", "ready", "served", "cancelled"];

  // Buttons offered for each status (same transitions as the backend)
  const NEXT_ACTIONS = {
    pending: [
      ["accepted", "✅ Accept", "btn-success btn-next"],
      ["cancelled", "❌ Cancel", "btn-outline-danger"],
    ],
    accepted: [["preparing", "🍳 Start Preparing", "btn-info btn-next"]],
    preparing: [["ready", "📦 Mark Ready", "btn-primary btn-next"]],
    ready: [["served", "🍽️ Mark Served", "btn-success btn-next"]],
    served: [],
    cancelled: [],
  };

  const escapeHtml = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  const formatRupees = (rupees) => {
    const paise = Math.round(Number(rupees) * 100);
    return paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2);
  };

  const updateEmptyState = () => {
    noOrders.classList.toggle("d-none", ordersList.children.length > 0);
  };

  const timeAgo = (minutes) => {
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} min ago`;
    if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} h ${minutes % 60} min ago`;
    const days = Math.floor(minutes / (24 * 60));
    return `${days} day${days === 1 ? "" : "s"} ago`;
  };

  // "11:57 pm · 4 min ago" today, "17 Oct, 1:32 pm · 4 days ago" for older orders
  function renderTimes() {
    const today = new Date().toDateString();
    document.querySelectorAll(".order-time[data-created]").forEach((el) => {
      const created = new Date(el.dataset.created);
      if (Number.isNaN(created.getTime())) return;
      const minutes = Math.max(0, Math.floor((Date.now() - created) / 60000));
      const time = created.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      const when =
        created.toDateString() === today
          ? time
          : `${created.toLocaleDateString([], { day: "numeric", month: "short" })}, ${time}`;
      el.textContent = `${when} · ${timeAgo(minutes)}`;
    });
  }

  function renderTracker(orderId, status) {
    const tracker = document.getElementById(`tracker-${orderId}`);
    if (!tracker) return;
    tracker.querySelectorAll("li").forEach((li) => {
      const step = li.dataset.step;
      li.classList.remove("completed", "cancelled");
      if (status === "cancelled") {
        if (step === "cancelled") li.classList.add("cancelled");
      } else if (STEPS.indexOf(step) <= STEPS.indexOf(status)) {
        li.classList.add("completed");
      }
    });
  }

  function renderActions(card) {
    const status = card.dataset.status;
    const actions = card.querySelector(".order-actions");
    const buttons = NEXT_ACTIONS[status] || [];
    actions.innerHTML = buttons.length
      ? buttons
          .map(
            ([next, label, style]) =>
              `<button type="button" class="btn btn-sm ${style} update-status" data-status="${next}">${label}</button>`
          )
          .join("")
      : `<span class="text-muted small">${status === "served" ? "Served ✔" : "Cancelled"}</span>`;
  }

  function orderCard(order) {
    const card = document.createElement("div");
    card.className = "col-md-6 col-xl-4 kitchen-order";
    card.id = `order-${order.id}`;
    card.dataset.status = order.status;
    card.innerHTML = `
      <div class="card shadow-sm">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start gap-2">
            <div>
              <h5 class="card-title m-0">Token #${escapeHtml(order.order_code ?? "—")}</h5>
              <small class="text-muted">Order #${escapeHtml(order.id)} · <span class="order-time" data-created="${escapeHtml(order.created_at || new Date().toISOString())}"></span></small>
            </div>
            <span class="badge text-bg-success">Paid</span>
          </div>

          <div class="d-flex justify-content-between mt-2 small">
            <span><strong>Table:</strong> ${escapeHtml(order.table_number || "N/A")}</span>
            <span><strong>Total:</strong> ₹${escapeHtml(formatRupees(order.total_amount))}</span>
          </div>

          <div class="order-tracker" id="tracker-${escapeHtml(order.id)}">
            <ul class="progressbar">
              ${STEPS.map(
                (step) => `<li data-step="${step}">${step.charAt(0).toUpperCase() + step.slice(1)}</li>`
              ).join("")}
            </ul>
          </div>

          <ul class="kitchen-items">
            ${(order.items || [])
              .map(
                (item) =>
                  `<li>${escapeHtml(item.menu_snapshot_name)} <strong>x ${escapeHtml(item.quantity)}</strong></li>`
              )
              .join("")}
          </ul>

          <div class="order-error alert alert-danger py-1 px-2 small d-none" role="alert"></div>

          <div class="order-actions"></div>
        </div>
      </div>
    `;
    return card;
  }

  function applyStatus(orderId, status) {
    const card = document.getElementById(`order-${orderId}`);
    if (!card) return;
    card.dataset.status = status;
    renderTracker(orderId, status);
    renderActions(card);

    // Finished orders leave the live board after a short delay
    if (status === "served" || status === "cancelled") {
      setTimeout(() => {
        card.remove();
        updateEmptyState();
      }, 3000);
    }
  }

  // Initial render for server-rendered cards
  ordersList.querySelectorAll(".kitchen-order").forEach(renderActions);
  renderTimes();
  setInterval(renderTimes, 30000);

  // === Connect to Socket.IO (room is assigned by the server from the login cookie) ===
  const socket = io();

  socket.on("connect_error", (err) => {
    console.error("❌ [CLIENT] Live updates unavailable:", err.message);
  });

  // === Handle new (paid) orders ===
  socket.on("orderReceived", (order) => {
    if (!order?.id || document.getElementById(`order-${order.id}`)) return;
    const card = orderCard(order);
    ordersList.appendChild(card); // oldest first, like the server-rendered list
    renderTracker(order.id, order.status);
    renderActions(card);
    renderTimes();
    updateEmptyState();
  });

  // === Handle status updates (from any staff screen) ===
  socket.on("orderStatusUpdated", ({ orderId, status }) => applyStatus(orderId, status));

  // === Button clicks (update status) ===
  ordersList.addEventListener("click", async (e) => {
    const btn = e.target.closest(".update-status");
    if (!btn) return;

    const card = btn.closest(".kitchen-order");
    const orderId = card.id.replace("order-", "");
    const newStatus = btn.dataset.status;
    const errorBox = card.querySelector(".order-error");

    if (newStatus === "cancelled" && !window.confirm("Cancel this order and refund the customer?")) {
      return;
    }

    card.querySelectorAll(".update-status").forEach((b) => (b.disabled = true));
    errorBox.classList.add("d-none");

    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      applyStatus(orderId, data.order.status);
    } catch (err) {
      errorBox.textContent = `Could not update order: ${err.message}`;
      errorBox.classList.remove("d-none");
      renderActions(card); // restore buttons for the current status
    }
  });
});
