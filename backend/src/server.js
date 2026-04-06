const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');
const http = require('http');
const connectDB = require('./config/db');

connectDB();
require('./utils/mailer');
require('./jobs/archive.job');
require('./jobs/trend-prediction.job');

// Import models to register them with Mongoose
require('./models/User');
require('./models/Municipality');
require('./models/Department');

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Socket.io setup
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3001",
    ],
    credentials: true,
  },
});

// Store io instance on app for use in controllers
app.set("io", io);

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Join user-specific room
  socket.on("join", (room) => {
    if (room && typeof room === "string") {
      socket.join(room);
      console.log(`Socket ${socket.id} joined room: ${room}`);
    }
  });

  // Leave room
  socket.on("leave", (room) => {
    if (room && typeof room === "string") {
      socket.leave(room);
      console.log(`Socket ${socket.id} left room: ${room}`);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Socket.io enabled`);
});
