//server.js
// ─────────────────────────────────────────────
//  IMPORTS
// ─────────────────────────────────────────────
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

// ─────────────────────────────────────────────
//  APP SETUP
// ─────────────────────────────────────────────
const app = express();

// Wrap express inside a plain HTTP server
// Socket.io needs this — it piggybacks on the same port
const httpServer = http.createServer(app);

// Attach Socket.io to the HTTP server
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all origins (fine for local dev)
    methods: ["GET", "POST"],
  },
});

// Serve the client/ folder as static files
// When browser opens http://localhost:3000 it gets index.html
app.use(express.static(path.join(__dirname, "../client")));

// ─────────────────────────────────────────────
//  IN-MEMORY STORE
//  We keep a Map of socketId → username
//  so we know who is who when they disconnect
// ─────────────────────────────────────────────
const users = new Map(); // { socketId: "username" }

// ─────────────────────────────────────────────
//  SOCKET.IO EVENTS
// ─────────────────────────────────────────────
io.on("connection", (socket) => {
  // 'socket' represents ONE connected browser tab

  console.log(`🔌 New connection: ${socket.id}`);

  // ── 1. USER SETS THEIR USERNAME ────────────────────────────
  // Client emits "set_username" with the name they typed
  socket.on("set_username", (username) => {
    users.set(socket.id, username); // Remember this socket's name
    console.log(`✅ ${username} joined (${socket.id})`);

    // Tell EVERYONE (including sender) that this person joined
    io.emit("user_joined", {
      username,
      message: `${username} joined the chat`,
      time: getTime(),
    });

    // Send the new user the current online count
    io.emit("online_count", users.size);
  });

  // ── 2. USER SENDS A CHAT MESSAGE ───────────────────────────
  socket.on("send_message", (data) => {
    const username = users.get(socket.id) || "Anonymous";

    // Broadcast to ALL connected clients (including sender)
    io.emit("receive_message", {
      username,
      message: data.message,
      time: getTime(),
    });
  });

  // ── 3. TYPING INDICATOR ────────────────────────────────────
  socket.on("typing", () => {
    const username = users.get(socket.id);
    if (!username) return;

    // Tell EVERYONE EXCEPT the sender that this user is typing
    socket.broadcast.emit("user_typing", { username });
  });

  socket.on("stop_typing", () => {
    socket.broadcast.emit("user_stop_typing");
  });

  // ── 4. USER DISCONNECTS ────────────────────────────────────
  socket.on("disconnect", () => {
    const username = users.get(socket.id);
    if (username) {
      users.delete(socket.id); // Remove from our map
      console.log(`❌ ${username} left (${socket.id})`);

      // Tell everyone this user left
      io.emit("user_left", {
        username,
        message: `${username} left the chat`,
        time: getTime(),
      });

      // Update online count
      io.emit("online_count", users.size);
    }
  });
});

// ─────────────────────────────────────────────
//  HELPER: Get current time as HH:MM string
// ─────────────────────────────────────────────
function getTime() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ─────────────────────────────────────────────
//  START SERVER
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
