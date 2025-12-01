const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Simple Linear Congruential Generator (LCG) for demonstrating patterns
class SimpleLCG {
  constructor(seed = Date.now()) {
    this.state = seed % 2147483647;
    if (this.state <= 0) this.state += 2147483646;
  }
  
  next() {
    // LCG parameters (these will show patterns!)
    this.state = (this.state * 48271) % 2147483647;
    return this.state & 0xFF; // Return byte value
  }
}

const lcg = new SimpleLCG();

// Enable CORS for local development
app.use(cors());

// Serve static files
app.use(express.static(__dirname));

// API endpoint to get random bytes from various sources
app.get('/api/random', (req, res) => {
  const count = parseInt(req.query.count) || 256;
  const source = req.query.source || 'qrandom'; // urandom, lcg, or math
  const maxCount = 100000; // Increased limit for pattern analysis
  
  const bytesToRead = Math.min(count, maxCount);
  
  try {
    let randomBytes;
    
    switch (source) {
      case 'urandom':
        // Read from /dev/urandom (cryptographically secure)
        const buffer = Buffer.alloc(bytesToRead);
        const fd = fs.openSync('/dev/qrandom', 'r');
        fs.readSync(fd, buffer, 0, bytesToRead, null);
        fs.closeSync(fd);
        randomBytes = Array.from(buffer);
        break;
        
      case 'lcg':
        // Linear Congruential Generator (will show patterns!)
        randomBytes = [];
        for (let i = 0; i < bytesToRead; i++) {
          randomBytes.push(lcg.next());
        }
        break;
        
      case 'math':
        // JavaScript Math.random (also shows patterns)
        randomBytes = [];
        for (let i = 0; i < bytesToRead; i++) {
          randomBytes.push(Math.floor(Math.random() * 256));
        }
        break;
        
      default:
        throw new Error('Invalid source. Use: urandom, lcg, or math');
    }
    
    res.json({
      bytes: randomBytes,
      count: randomBytes.length,
      source: source,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error generating random data:', error);
    res.status(500).json({
      error: 'Failed to generate random data',
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
