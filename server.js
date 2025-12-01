const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Enable CORS for local development
app.use(cors());

// Serve static files
app.use(express.static(__dirname));

// API endpoint to get random bytes from /dev/random
app.get('/api/random', (req, res) => {
  const count = parseInt(req.query.count) || 256;
  const maxCount = 4096; // Limit to prevent excessive reads
  
  const bytesToRead = Math.min(count, maxCount);
  
  try {
    // Read random bytes from /dev/random
    const buffer = Buffer.alloc(bytesToRead);
    const fd = fs.openSync('/dev/qrandom', 'r');
    fs.readSync(fd, buffer, 0, bytesToRead, null);
    fs.closeSync(fd);
    
    // Convert buffer to array of numbers
    const randomBytes = Array.from(buffer);
    
    res.json({
      bytes: randomBytes,
      count: randomBytes.length,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error reading /dev/random:', error);
    res.status(500).json({
      error: 'Failed to read random data',
      message: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`Random Visualization Server running at http://localhost:${PORT}`);
  console.log(`API endpoint: http://localhost:${PORT}/api/random`);
});
