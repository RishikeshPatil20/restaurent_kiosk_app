// backend/src/sockets/kitchenSocket.js
export default function kitchenSocket(io) {
  io.on("connection", (socket) => {
    console.log("🔌 Client connected:", socket.id);

    socket.on("joinRoom", ({ role }) => {
      if (role === "kiosk" || role === "kiosk-user") {
        socket.join("kiosk");
        console.log(`📱 Kiosk joined: ${socket.id}`);
      } else if (role === "staff" || role === "admin") {
        socket.join("kitchen");
        console.log(`👨‍🍳 Kitchen staff joined: ${socket.id}`);
      } else {
        console.warn(`⚠️ Unknown role tried to join: ${role}`);
      }
    });

    socket.on("disconnect", () => {
      console.log("❌ Client disconnected:", socket.id);
    });
  });
}
