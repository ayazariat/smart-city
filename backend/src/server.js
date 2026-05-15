const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = require('./app');
const http = require('http');
const connectDB = require('./config/db');
const { verifyAccessToken, extractToken } = require('./utils/jwt');

connectDB().catch(err => {
  console.warn("[DB] Initial connection failed (server will continue running):", err.message);
});
require('./utils/mailer');

// Register Mongoose models
require('./models/User');
require('./models/Municipality');
require('./models/Department');
require('./models/SatisfactionSurvey');

const startJobs = () => {
  try { require('./jobs/archive.job'); } catch(e) { console.warn("[JOB] archive.job failed:", e.message); }
  try { require('./jobs/trend-prediction.job'); } catch(e) { console.warn("[JOB] trend-prediction.job failed:", e.message); }
};
setTimeout(startJobs, 5000);

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);
const isAllowedOrigin = app.get("isAllowedOrigin");

// Socket.io setup
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!isAllowedOrigin || isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin not allowed by Socket.IO CORS: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST"]
  },
});

// Store io instance on app for use in controllers
app.set("io", io);

const getSocketToken = (socket) => {
  const authToken =
    typeof socket.handshake.auth?.token === 'string'
      ? socket.handshake.auth.token
      : null;
  const headerToken = extractToken(socket.handshake.headers?.authorization);
  return authToken || headerToken || null;
};

// Socket.io authentication middleware
io.use((socket, next) => {
  try {
    const token = getSocketToken(socket);
    if (!token) {
      return next();
    }
    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return next();
    }
    socket.userId = decoded.userId;
    socket.userRole = decoded.role;
  } catch {
    // Allow connection but without auth — public features still work
  }
  next();
});

// Socket.io connection handling
io.on("connection", (socket) => {
  if (socket.userId) {
    socket.join(`user:${socket.userId}`);
  }

  // Join user-specific room
  socket.on("join", (room) => {
    if (
      socket.userId &&
      room &&
      typeof room === "string" &&
      room === `user:${socket.userId}`
    ) {
      socket.join(room);
    }
  });

  // Leave room
  socket.on("leave", (room) => {
    if (
      socket.userId &&
      room &&
      typeof room === "string" &&
      room === `user:${socket.userId}`
    ) {
      socket.leave(room);
    }
  });

  socket.on("disconnect", () => {});
});

server.listen(PORT, () => {
  // Server running on http://localhost:${PORT}
  // Socket.io enabled
});
