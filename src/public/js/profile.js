// public/js/profile.js
document.addEventListener("DOMContentLoaded", () => {
  const STEPS = ["pending", "accepted", "preparing", "ready", "served", "cancelled"];

  // The server puts this socket in the user's private room based on the login cookie
  const socket = io();

  socket.on("connect_error", (err) => {
    console.error("❌ [CLIENT] Live updates unavailable:", err.message);
  });

  // === Handle live order status updates ===
  socket.on("orderStatusUpdated", ({ orderId, status }) => {
    const tracker = document.getElementById(`tracker-${orderId}`);
    if (!tracker) return;

    tracker.querySelectorAll("li").forEach((li) => {
      li.classList.remove("completed", "cancelled");
      const step = li.dataset.step;

      if (status === "cancelled") {
        if (step === "cancelled") li.classList.add("cancelled");
      } else if (STEPS.indexOf(step) <= STEPS.indexOf(status)) {
        li.classList.add("completed");
      }
    });
  });

  // === Handle payment confirmations ===
  socket.on("paymentStatusUpdated", ({ orderId, paymentStatus }) => {
    const badge = document.getElementById(`payment-${orderId}`);
    if (badge && paymentStatus === "paid") {
      badge.className = "badge text-bg-success";
      badge.textContent = "Paid";
    }
  });
});
