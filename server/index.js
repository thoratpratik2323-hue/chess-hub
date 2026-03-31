const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());

// Serve static files from the Vite build output
app.use(express.static(path.join(__dirname, "../vite-project/dist")));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // In production, we'll allow all for simplicity or specify the Render URL
    methods: ["GET", "POST"],
  },
});

// Room state: tracking players connected to rooms
const rooms = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join_room", (roomId) => {
    // initialize room if it does not exist
    if (!rooms[roomId]) {
      rooms[roomId] = { players: {} };
    }

    const room = rooms[roomId];
    const playerIds = Object.keys(room.players);

    if (playerIds.length >= 2 && !room.players[socket.id]) {
      // room is full
      socket.emit("room_full");
      return;
    }

    socket.join(roomId);

    // Assign color
    let color = "w";
    if (playerIds.length === 1) {
      // The other player's color
      const otherId = playerIds[0];
      color = room.players[otherId] === "w" ? "b" : "w";
    }

    room.players[socket.id] = color;
    
    console.log(`User ${socket.id} joined room ${roomId} as ${color === 'w' ? 'White' : 'Black'}`);

    // Let the player know their color
    socket.emit("player_color", color);

    // If two players are in, the game can start
    if (Object.keys(room.players).length === 2) {
      io.to(roomId).emit("game_ready", "Both players joined! Game is ON.");
    }
  });

  socket.on("make_move", ({ roomId, move }) => {
    console.log(`Move in ${roomId}:`, move);
    // broadcast move to everyone else in the room
    socket.to(roomId).emit("receive_move", move);
  });

  socket.on("send_message", ({ roomId, message }) => {
    const color = rooms[roomId]?.players[socket.id];
    io.to(roomId).emit("receive_message", { color, text: message });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    // remove player from any room they were in
    for (const roomId in rooms) {
      if (rooms[roomId].players[socket.id]) {
        delete rooms[roomId].players[socket.id];
        socket.to(roomId).emit("opponent_disconnected", "Your opponent left the game.");
        // If room is empty, optionally delete it
        if (Object.keys(rooms[roomId].players).length === 0) {
          delete rooms[roomId];
        }
      }
    }
  });

});

// Handle all other routes by serving the frontend's index.html
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "../vite-project/dist/index.html"));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`♟️ Backend server running on port ${PORT}`);
});
