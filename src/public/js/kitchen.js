// public/js/kitchen.js
document.addEventListener("DOMContentLoaded", () => {
  console.log("👨‍🍳 [CLIENT] Kitchen dashboard loaded...");

  // === Connect to Socket.IO ===
  const socket = io();
  console.log("🔌 [CLIENT] Socket connecting...");

  socket.on("connect", () => {
    console.log("✅ [CLIENT] Socket connected:", socket.id);
    socket.emit("joinRoom", { role: "staff" });
    console.log("📡 [CLIENT] Joined 'kitchen' room as staff");
  });

  socket.on("disconnect", () => {
    console.log("❌ [CLIENT] Socket disconnected");
  });

  const ordersList = document.getElementById("orders-list");

  // === Handle new orders ===
  socket.on("orderReceived", (order) => {
    console.log("📦 [CLIENT] New Order Received:", order);

    if (!order || !order.id) {
      console.error("⚠️ [CLIENT] Invalid order payload:", order);
      return;
    }

    const card = document.createElement("div");
    card.className = "col-md-6 mb-3";
    card.id = `order-${order.id}`;
    card.innerHTML = `
      <div class="card shadow-sm">
        <div class="card-body">
          <h5 class="card-title">Order #${order.id}</h5>
          <p><strong>Total:</strong> ₹${order.total_amount}</p>

          <div class="order-tracker" id="tracker-${order.id}">
            <ul class="progressbar">
              <li class="active" data-step="pending">Pending</li>
              <li data-step="accepted">Accepted</li>
              <li data-step="preparing">Preparing</li>
              <li data-step="ready">Ready</li>
              <li data-step="served">Served</li>
              <li data-step="cancelled">Cancelled</li>
            </ul>
          </div>

          <ul>
            ${order.items
              .map(
                (item) => `
              <li>${item.menu_snapshot_name} x ${item.quantity}</li>
            `
              )
              .join("")}
          </ul>

          <div class="btn-group mt-2">
            <button class="btn btn-sm btn-secondary update-status"
                    data-id="${
                      order.id
                    }" data-status="accepted">✅ Accept</button>
            <button class="btn btn-sm btn-info update-status"
                    data-id="${
                      order.id
                    }" data-status="preparing" disabled>🍳 Preparing</button>
            <button class="btn btn-sm btn-primary update-status"
                    data-id="${
                      order.id
                    }" data-status="ready" disabled>📦 Ready</button>
            <button class="btn btn-sm btn-success update-status"
                    data-id="${
                      order.id
                    }" data-status="served" disabled>🍽️ Served</button>
            <button class="btn btn-sm btn-danger update-status"
                    data-id="${
                      order.id
                    }" data-status="cancelled">❌ Cancel</button>
          </div>
        </div>
      </div>
    `;

    ordersList.prepend(card); // put newest orders on top
  });

  // === Handle status updates ===
  socket.on("orderStatusUpdated", ({ orderId, status }) => {
    console.log(
      `📡 [CLIENT] Kitchen got update: Order #${orderId} → ${status}`
    );

    const tracker = document.querySelector(`#tracker-${orderId}`);
    if (tracker) {
      const steps = tracker.querySelectorAll("li");
      let activeIndex = -1;

      steps.forEach((step, index) => {
        if (step.dataset.step === status) {
          activeIndex = index;
        }
      });

      steps.forEach((step, index) => {
        if (index <= activeIndex) step.classList.add("active");
        else step.classList.remove("active");
      });
    }

    // ✅ Pass current status properly to isAllowedTransition
    const buttons = document.querySelectorAll(
      `#order-${orderId} .update-status`
    );
    buttons.forEach((btn) => {
      const nextStatus = btn.dataset.status;
      btn.disabled = !isAllowedTransition(status, nextStatus);
    });

    console.log(`🔄 [CLIENT] Updated DOM for Order #${orderId} → ${status}`);
  });

  // === Button clicks (update status) ===
  ordersList.addEventListener("click", async (e) => {
    if (e.target.classList.contains("update-status")) {
      const orderId = e.target.dataset.id;
      const newStatus = e.target.dataset.status;
      console.log(
        `🖱️ [CLIENT] Button clicked: Order #${orderId} → ${newStatus}`
      );

      try {
        const res = await fetch(`/api/orders/${orderId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch (err) {
        console.error("❌ [CLIENT] Error updating status:", err);
      }
    }
  });

  // === Transition rules (same as backend) ===
  function isAllowedTransition(current, next) {
    const transitions = {
      pending: ["accepted", "cancelled"],
      accepted: ["preparing"],
      preparing: ["ready"],
      ready: ["served"],
      served: [],
      cancelled: [],
    };
    return transitions[current]?.includes(next);
  }
});
