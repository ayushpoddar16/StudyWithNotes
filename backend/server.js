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
//   origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
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

require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import configurations and middleware
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const materialRoutes = require('./routes/materials');
const uploadRoutes = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// CORS Configuration - Fixed
const allowedOrigins = [
  'https://studywithnotes-ayush.onrender.com',
  'http://localhost:3000',
  'http://localhost:3001'
];

// Add any additional origins from environment variable
if (process.env.ALLOWED_ORIGINS) {
  const envOrigins = process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
  allowedOrigins.push(...envOrigins);
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Add preflight handling for all routes
app.options('*', cors());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
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
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      allowedOrigins: allowedOrigins
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
  console.log('🌐 Allowed origins:', allowedOrigins);
});