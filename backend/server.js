// require('dotenv').config();
// const express = require('express');
// const cors = require('cors');

// // Import configurations and middleware
// const connectDB = require('./config/database');
// const errorHandler = require('./middleware/errorHandler');
// const materialRoutes = require('./routes/materials'); // or wherever this file is
// const uploadRoutes = require('./routes/upload');

// const app = express();
// const PORT = process.env.PORT || 5000;

// // Connect to MongoDB
// connectDB();

// // Middleware
// app.use(cors({
//   origin: process.env.ALLOWED_ORIGINS?.split(',') || 'https://studywithnotes-ayush.onrender.com',
//   credentials: true
// }));

// app.use(express.json({ limit: '50mb' }));
// app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// // Add this line to your server.js
// app.use('/api/materials', materialRoutes);
// app.use('/api/upload', uploadRoutes);

// // Health check endpoint
// app.get('/api/health', async (req, res) => {
//   try {
//     const mongoose = require('mongoose');
    
//     res.json({
//       success: true,
//       message: 'Server is running with GridFS',
//       timestamp: new Date().toISOString(),
//       database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Health check failed',
//       error: error.message
//     });
//   }
// });

// // Error handling middleware
// app.use(errorHandler);

// // Start server
// app.listen(PORT, () => {
//   console.log('🚀 Debug Server Started');
//   console.log(`📡 Server running on port ${PORT}`);
//   console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
// });
require("dotenv").config();
const express = require("express");
const cors = require("cors");

console.log("🔍 Starting server initialization...");

const app = express();
const PORT = process.env.PORT || 5000;

console.log("✅ Express app created");

// Import configurations and middleware step by step with error handling
let connectDB, errorHandler, materialRoutes, uploadRoutes;

try {
  console.log("📦 Loading database connection...");
  connectDB = require("./config/database");
  console.log("✅ Database connection loaded");
} catch (error) {
  console.error("❌ Error loading database connection:", error.message);
  process.exit(1);
}

try {
  console.log("📦 Loading error handler...");
  errorHandler = require("./middleware/errorHandler");
  console.log("✅ Error handler loaded");
} catch (error) {
  console.error("❌ Error loading error handler:", error.message);
  console.log("⚠️ Continuing without error handler...");
}

// Connect to MongoDB
try {
  console.log("🔌 Connecting to MongoDB...");
  connectDB();
  console.log("✅ MongoDB connection initiated");
} catch (error) {
  console.error("❌ MongoDB connection error:", error.message);
}

// CORS Configuration
console.log("🌐 Setting up CORS...");
// Simple CORS configuration that should work
const corsOptions = {
  origin: [
    "https://studywithnotes-ayush.onrender.com",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:3001",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With", 
    "Content-Type",
    "Accept",
    "Authorization",
    "Cache-Control",
    "Pragma"
  ],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
console.log("✅ CORS configured");

// Preflight handling
app.options("*", (req, res) => {
  console.log("🔄 Preflight request for:", req.url);
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,PATCH,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin,X-Requested-With,Content-Type,Accept,Authorization,Cache-Control,Pragma");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Max-Age", "86400");
  res.sendStatus(200);
});
console.log("✅ Preflight handling configured");

// Body parsing middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
console.log("✅ Body parsing middleware configured");

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.url} from ${req.headers.origin || "unknown"}`);
  next();
});
console.log("✅ Request logging middleware configured");

// Health check endpoint (load this first to test basic functionality)
app.get("/api/health", async (req, res) => {
  try {
    const mongoose = require("mongoose");
    res.json({
      success: true,
      message: "Server is running with GridFS",
      timestamp: new Date().toISOString(),
      database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
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
console.log("✅ Health check endpoint configured");

// Load material routes
try {
  console.log("📦 Loading material routes...");
  materialRoutes = require("./routes/materials");
  console.log("✅ Material routes module loaded");
  
  console.log("🔗 Mounting material routes at /api/materials...");
  app.use("/api/materials", materialRoutes);
  console.log("✅ Material routes mounted successfully");
} catch (error) {
  console.error("❌ Error with material routes:", error.message);
  console.error("❌ Stack trace:", error.stack);
  
  // Create a fallback route
  app.get("/api/materials/error", (req, res) => {
    res.status(500).json({
      success: false,
      message: "Material routes failed to load",
      error: error.message
    });
  });
}

// Load upload routes
try {
  console.log("📦 Loading upload routes...");
  uploadRoutes = require("./routes/upload");
  console.log("✅ Upload routes module loaded");
  
  console.log("🔗 Mounting upload routes at /api/upload...");
  app.use("/api/upload", uploadRoutes);
  console.log("✅ Upload routes mounted successfully");
} catch (error) {
  console.error("❌ Error with upload routes:", error.message);
  console.error("❌ Stack trace:", error.stack);
  
  // Create a fallback route
  app.get("/api/upload/error", (req, res) => {
    res.status(500).json({
      success: false,
      message: "Upload routes failed to load",
      error: error.message
    });
  });
}

// Error handling middleware
if (errorHandler) {
  app.use(errorHandler);
  console.log("✅ Error handler configured");
}

// Catch-all route for debugging
app.get("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Start server
try {
  console.log("🚀 Starting server...");
  app.listen(PORT, () => {
    console.log("🚀 Server Started Successfully");
    console.log(`📡 Server running on port ${PORT}`);
    console.log(`🔍 Health check: https://studywithnotes-ayush.onrender.com/api/health`);
    console.log("🌐 CORS enabled for:", [
      "https://studywithnotes-ayush.onrender.com",
      "http://localhost:3000",
      "http://localhost:5173",
    ]);
  });
} catch (error) {
  console.error("❌ Server startup error:", error.message);
  console.error("❌ Stack trace:", error.stack);
}