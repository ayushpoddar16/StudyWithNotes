require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration
app.use(cors({
  origin: [
    'https://studywithnotes-ayush.onrender.com',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Minimal server is running',
    timestamp: new Date().toISOString()
  });
});

// Temporary API endpoints for testing
app.get('/api/materials/search', (req, res) => {
  res.json({
    success: true,
    message: 'Materials search endpoint working',
    data: [],
    pagination: {
      page: 1,
      limit: 12,
      total: 0
    }
  });
});

app.get('/api/materials', (req, res) => {
  res.json({
    success: true,
    message: 'Materials endpoint working',
    data: []
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 Minimal Server Started');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
});