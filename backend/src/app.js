const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const path = require("path");
const authRoutes = require("./routes/auth");
const citizenRoutes = require("./routes/citizen.routes");
const agentRoutes = require("./routes/agent.routes");
const managerRoutes = require("./routes/manager.routes");
const technicianRoutes = require("./routes/technician.routes");
const adminRoutes = require("./routes/admin.routes");
const complaintRoutes = require("./routes/complaints");
const uploadRoutes = require("./routes/upload");
const notificationRoutes = require("./routes/notifications.routes");
const aiRoutes = require("./routes/ai.routes");
const publicRoutes = require("./routes/public.routes");
const heatmapRoutes = require("./routes/heatmap.routes");
const activityRoutes = require("./routes/activity.routes");

const app = express();

const staticAllowedOrigins = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
  "http://localhost:5000",
  "http://127.0.0.1:5000",
  "http://10.0.2.2:5000",
  "http://10.0.2.2:3000",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:51271",
  "http://127.0.0.1:51271",
  "http://10.0.2.2:51271",
]);

const dynamicAllowedOriginPatterns = [
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
  /^http:\/\/10\.0\.2\.2:\d+$/,
  /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
  /^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+:\d+$/,
];

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  return (
    staticAllowedOrigins.has(origin) ||
    dynamicAllowedOriginPatterns.some((pattern) => pattern.test(origin))
  );
};

app.set("isAllowedOrigin", isAllowedOrigin);

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
  credentials: true,
}));
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
// express-mongo-sanitize's default middleware sets req.query/req.params which are read-only in Express 5.
// Sanitize body/headers via reassignment, and query/params in-place only.
app.use((req, res, next) => {
  if (req.body)    req.body    = mongoSanitize.sanitize(req.body);
  if (req.params)  mongoSanitize.sanitize(req.params);   // mutates in-place, no reassignment (read-only in Express 5)
  if (req.headers) req.headers = mongoSanitize.sanitize(req.headers);
  if (req.query)   mongoSanitize.sanitize(req.query);    // mutates in-place, no reassignment (read-only in Express 5)
  next();
});
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

// Rate limiters
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 200, message: { message: "Too many requests, please try again later." } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { message: "Too many authentication attempts, please try again later." } });
// Stricter limiter for complaint creation — applied at route level in complaints.js
app.use("/api", apiLimiter);

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Routes
app.get("/", (req, res) => {
  res.json({ 
    message: "Welcome to Smart City API",
    version: "1.0.0"
  });
});

// Mount routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/citizen", citizenRoutes);
app.use("/api/agent", agentRoutes);
app.use("/api/manager", managerRoutes);
app.use("/api/technician", technicianRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/notifications", notificationRoutes.router);
app.use("/api/ai", aiRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/heatmap", heatmapRoutes);
app.use("/api/activity", activityRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!", error: err.message });
});

module.exports = app;
