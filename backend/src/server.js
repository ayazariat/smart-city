const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');
const http = require('http');
const connectDB = require('./config/db');
const { verifyAccessToken, extractToken } = require('./utils/jwt');

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
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Socket.io enabled`);
});
