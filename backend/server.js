require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import configurations and middleware
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const materialRoutes = require('./routes/materials'); // or wherever this file is

// Import GridFS configuration
require('./config/gridfs');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

console.log('📁 Using GridFS for file storage - no local uploads directory needed');

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

console.log('📡 Files will be served from GridFS via API endpoints');

// Test routes one by one - uncomment one at a time to find the problematic one

console.log('🔍 Testing materialRoutes...');
try {
  const materialRoutes = require('./routes/materials');
  console.log('✅ materialRoutes loaded successfully');
  app.use('/api/materials', materialRoutes);
} catch (error) {
  console.error('❌ Error in materialRoutes:', error.message);
}

console.log('🔍 Testing uploadRoutes...');
try {
  const uploadRoutes = require('./routes/upload');
  console.log('✅ uploadRoutes loaded successfully');
  app.use('/api/upload', uploadRoutes);
} catch (error) {
  console.error('❌ Error in uploadRoutes:', error.message);
}

console.log('🔍 Testing statsRoutes...');
try {
  const statsRoutes = require('./routes/stats');
  console.log('✅ statsRoutes loaded successfully');
  app.use('/api/stats', statsRoutes);
} catch (error) {
  console.error('❌ Error in statsRoutes:', error.message);
}
// Add this line to your server.js
app.use('/api', materialRoutes);
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