// backend/src/server.js
import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import kitchenSocket from "./sockets/kitchenSocket.js";

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

// Attach io to app so controllers can use it
app.set("io", io);

// Initialize kitchen sockets
kitchenSocket(io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
