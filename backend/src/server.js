const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');
const http = require('http');
const jwt = require('jsonwebtoken');
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
      "http://10.0.2.2:3000",
    ],
    credentials: true,
    methods: ["GET", "POST"]
  },
});

// Store io instance on app for use in controllers
app.set("io", io);

// Socket.io authentication middleware
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace("Bearer ", "");
    if (!token) {
      return next();
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    socket.userRole = decoded.role;
  } catch {
    // Allow connection but without auth — public features still work
  }
  next();
});

// Socket.io connection handling
io.on("connection", (socket) => {
  // Join user-specific room
  socket.on("join", (room) => {
    if (room && typeof room === "string") {
      socket.join(room);
    }
  });

  // Leave room
  socket.on("leave", (room) => {
    if (room && typeof room === "string") {
      socket.leave(room);
    }
  });

  socket.on("disconnect", () => {});
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Socket.io enabled`);
});
