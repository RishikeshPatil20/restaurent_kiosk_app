// backend/src/sockets/kitchenSocket.js
import jwt from "jsonwebtoken";

const readCookie = (header, name) => {
  for (const part of (header || "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
};

// Room naming shared with controllers that emit events
export const userRoom = (userId) => `user:${userId}`;

export default function kitchenSocket(io) {
  // Only authenticated users may connect; rooms come from the verified token, not the client
  io.use((socket, next) => {
    const token = readCookie(socket.handshake.headers.cookie, "token");
    try {
      const { id, role } = jwt.verify(token, process.env.SECRET_KEY);
      socket.data.user = { id, role };
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const { id, role } = socket.data.user;

    if (role === "staff" || role === "admin") {
      socket.join("kitchen");
    }
    // Every user gets a private room for updates about their own orders
    socket.join(userRoom(id));
  });
}
