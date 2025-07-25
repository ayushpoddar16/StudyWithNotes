// routes/stats.js
const express = require('express');
const router = express.Router();

router.get('/stats', (req, res) => {
  res.json({ message: 'Stats route working' });
});

module.exports = router;