const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
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

const app = express();

// Middleware
app.use(cors({
  origin: [
    "http://localhost:3000", 
    "http://127.0.0.1:3000", 
    "http://localhost:3001", 
    "http://127.0.0.1:3001",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "http://10.0.2.2:5000",
    "http://10.0.2.2:3000",
  ],
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

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
app.use("/api/auth", authRoutes);
app.use("/api/citizen", citizenRoutes);
app.use("/api/agent", agentRoutes);
app.use("/api/manager", managerRoutes);
app.use("/api/technician", technicianRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/notifications", notificationRoutes.router);
app.use("/api/ai", aiRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Error handler
app.use((err, req, res) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!", error: err.message });
});

module.exports = app;
