require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import configurations and middleware
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const materialRoutes = require('./routes/materials'); // or wherever this file is
const uploadRoutes = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
// CORS Configuration - Fixed
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://studywithnotes-ayush.onrender.com',
      'http://localhost:3000', // for local development
      'http://localhost:5173', // for Vite dev server
      // Add any other frontend URLs you need
    ];
    
    // Check if the origin is in the allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma'
  ]
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Add this line to your server.js
app.use('/api/materials', materialRoutes);
app.use('/api/upload', uploadRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    
    res.json({
      success: true,
      message: 'Server is running with GridFS',
      timestamp: new Date().toISOString(),
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log('🚀 Debug Server Started');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
});