// public/js/profile.js
document.addEventListener("DOMContentLoaded", () => {
  console.log("👤 [CLIENT] Profile page loaded...");

  const socket = io();
  console.log("🔌 [CLIENT] Socket connecting...");

  socket.on("connect", () => {
    console.log("✅ [CLIENT] Socket connected:", socket.id);
    socket.emit("joinRoom", { role: "kiosk" });
    console.log("📡 [CLIENT] Joined 'kiosk' room for live updates");
  });

  socket.on("disconnect", () => {
    console.log("❌ [CLIENT] Socket disconnected");
  });

  // === Handle live order status updates ===
  socket.on("orderStatusUpdated", ({ orderId, status }) => {
    console.log(`📡 [CLIENT] Profile got update: Order #${orderId} → ${status}`);

    const tracker = document.querySelector(`#tracker-${orderId}`);
    if (!tracker) {
      console.warn(`⚠️ [CLIENT] No tracker found for order #${orderId}`);
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
});
