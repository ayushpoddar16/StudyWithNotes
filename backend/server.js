
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Import configurations and middleware
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Import routes (we'll create these next)
const materialRoutes = require('./routes/materials');
const uploadRoutes = require('./routes/upload');
const statsRoutes = require('./routes/stats');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory');
}

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(uploadsDir));

// Add this before your app.use() calls
console.log('materialRoutes type:', typeof materialRoutes);
console.log('uploadRoutes type:', typeof uploadRoutes);
console.log('statsRoutes type:', typeof statsRoutes);

// Then comment out the routes one by one to identify the problematic one:
app.use('/api', materialRoutes);
app.use('/api', uploadRoutes);
// app.use('/api', statsRoutes);


// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    database: require('mongoose').connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await require('mongoose').connection.close();
  console.log('📊 Database connection closed.');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
});