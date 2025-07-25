require("dotenv").config();
const express = require("express");
const cors = require("cors");

// Import configurations and middleware
const connectDB = require("./config/database");
const errorHandler = require("./middleware/errorHandler");
const materialRoutes = require("./routes/materials");
const uploadRoutes = require("./routes/upload");

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// CORS Configuration - COMPREHENSIVE FIX
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      "https://studywithnotes-ayush.onrender.com",
      "http://localhost:3000",
      "http://localhost:5173",
      "http://localhost:3001",
    ];

    console.log("🌐 Request from origin:", origin);

    if (allowedOrigins.includes(origin)) {
      console.log("✅ Origin allowed:", origin);
      callback(null, true);
    } else {
      console.log("❌ Origin blocked:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
    "Cache-Control",
    "Pragma",
    "Content-Length",
    "Accept-Encoding",
  ],
  exposedHeaders: ["Content-Length", "Content-Type"],
  maxAge: 86400, // 24 hours
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Explicit preflight handling
app.options("*", (req, res) => {
  console.log("🔄 Preflight request for:", req.url);
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,DELETE,PATCH,OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Origin,X-Requested-With,Content-Type,Accept,Authorization,Cache-Control,Pragma"
  );
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Max-Age", "86400");
  res.sendStatus(200);
});

// Body parsing middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(
    `📡 ${req.method} ${req.url} from ${req.headers.origin || "unknown"}`
  );
  next();
});

// Routes
app.use("/api/materials", materialRoutes);
app.use("/api/upload", uploadRoutes);

// Health check endpoint
app.get("/api/health", async (req, res) => {
  try {
    const mongoose = require("mongoose");

    res.json({
      success: true,
      message: "Server is running with GridFS",
      timestamp: new Date().toISOString(),
      database:
        mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      cors: "enabled",
      origin: req.headers.origin || "none",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Health check failed",
      error: error.message,
    });
  }
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log("🚀 Server Started Successfully");
  console.log(`📡 Server running on port ${PORT}`);
  console.log(
    `🔍 Health check: https://studywithnotes.onrender.com/api/health`
  );
  console.log("🌐 CORS enabled for:", [
    "https://studywithnotes-ayush.onrender.com",
    "http://localhost:3000",
    "http://localhost:5173",
  ]);
});
