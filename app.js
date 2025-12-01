// Application state
let currentMode = 'bits';
let currentSource = 'lcg'; // Default to LCG for visible patterns
let animationId = null;
let randomData = [];
let accumulatedData = []; // Store accumulated data for better pattern analysis
let canvas, ctx;
const MAX_ACCUMULATED_SAMPLES = 100000; // Increased for better pattern analysis

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('visualizationCanvas');
  ctx = canvas.getContext('2d');
  
  // Set canvas size
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  // Setup mode buttons
  const modeButtons = document.querySelectorAll('.mode-btn');
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      modeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentMode = btn.dataset.mode;
    });
  });
  
  // Setup source buttons
  const sourceButtons = document.querySelectorAll('.source-btn');
  sourceButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      sourceButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSource = btn.dataset.source;
      // Reset accumulated data when changing source
      accumulatedData = [];
    });
  });
  
  // Start fetching and visualizing data
  startVisualization();
});

function resizeCanvas() {
  const container = canvas.parentElement;
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
}

async function fetchRandomData() {
  try {
    const response = await fetch(`http://192.168.0.27:3000/api/random?count=5000&source=${currentSource}`);
    const data = await response.json();
    randomData = data.bytes;
    
    // Accumulate data for better statistical analysis
    accumulatedData.push(...data.bytes);
    
    // Keep only the most recent samples
    if (accumulatedData.length > MAX_ACCUMULATED_SAMPLES) {
      accumulatedData = accumulatedData.slice(-MAX_ACCUMULATED_SAMPLES);
    }
    
    // Update statistics with accumulated data for more accurate results
    updateStatistics(accumulatedData);
    return randomData;
  } catch (error) {
    console.error('Error fetching random data:', error);
    return null;
  }
}

function updateStatistics(data) {
  if (!data || data.length === 0) return;
  
  // Calculate mean
  const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
  
  // Calculate standard deviation
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  const stdDev = Math.sqrt(variance);
  
  // Estimate entropy (Shannon entropy)
  const freq = new Array(256).fill(0);
  data.forEach(val => freq[val]++);
  let entropy = 0;
  freq.forEach(count => {
    if (count > 0) {
      const p = count / data.length;
      entropy -= p * Math.log2(p);
    }
  });
  
  // Update UI
  document.getElementById('statMean').textContent = mean.toFixed(2);
  document.getElementById('statStdDev').textContent = stdDev.toFixed(2);
  document.getElementById('statSamples').textContent = data.length;
  document.getElementById('statEntropy').textContent = entropy.toFixed(2);
}

function startVisualization() {
  async function animate() {
    await fetchRandomData();
    
    if (randomData && randomData.length > 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      switch (currentMode) {
        case 'bits':
          drawBitPattern(randomData);
          break;
        case 'distribution':
          drawDistribution(randomData);
          break;
        case 'scatter':
          drawScatterPlot(randomData);
          break;
        case 'color':
          drawColorGrid(randomData);
          break;
      }
    }
    
    animationId = setTimeout(() => requestAnimationFrame(animate), 500);
  }
  
  animate();
}

function drawBitPattern(data) {
  const cellSize = 8;
  const cols = Math.floor(canvas.width / cellSize);
  const rows = Math.floor(canvas.height / cellSize);
  const totalCells = Math.min(data.length * 8, cols * rows);
  
  let bitIndex = 0;
  
  for (let i = 0; i < totalCells; i++) {
    const byteIndex = Math.floor(bitIndex / 8);
    const bitPosition = 7 - (bitIndex % 8);
    
    if (byteIndex >= data.length) break;
    
    const bit = (data[byteIndex] >> bitPosition) & 1;
    
    const x = (i % cols) * cellSize;
    const y = Math.floor(i / cols) * cellSize;
    
    // Create gradient effect based on surrounding bits
    const hue = (byteIndex / data.length) * 360;
    const lightness = bit ? 70 : 20;
    ctx.fillStyle = `hsl(${hue}, 70%, ${lightness}%)`;
    ctx.fillRect(x, y, cellSize - 1, cellSize - 1);
    
    bitIndex++;
  }
}

function drawDistribution(data) {
  const bins = 256;
  const histogram = new Array(bins).fill(0);
  
  // Use accumulated data for better distribution analysis
  const dataToUse = accumulatedData.length > 1000 ? accumulatedData : data;
  
  // Count frequencies
  dataToUse.forEach(val => histogram[val]++);
  
  // Find max for scaling
  const maxCount = Math.max(...histogram);
  
  // Draw bars
  const barWidth = canvas.width / bins;
  const heightScale = (canvas.height - 40) / maxCount;
  
  // Draw grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = canvas.height - 20 - (i * (canvas.height - 40) / 5);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  
  // Draw histogram bars
  histogram.forEach((count, i) => {
    const x = i * barWidth;
    const height = count * heightScale;
    const y = canvas.height - 20 - height;
    
    const hue = (i / bins) * 280;
    const gradient = ctx.createLinearGradient(x, y, x, canvas.height - 20);
    gradient.addColorStop(0, `hsla(${hue}, 70%, 60%, 0.8)`);
    gradient.addColorStop(1, `hsla(${hue}, 70%, 40%, 0.6)`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, Math.max(barWidth - 0.5, 1), height);
  });
  
  // Draw labels
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = '12px Inter';
  ctx.textAlign = 'left';
  ctx.fillText('0', 5, canvas.height - 5);
  ctx.textAlign = 'right';
  ctx.fillText('255', canvas.width - 5, canvas.height - 5);
  ctx.textAlign = 'center';
  ctx.fillText(`Max: ${maxCount}`, canvas.width / 2, 20);
}

function drawScatterPlot(data) {
  const padding = 40;
  const plotWidth = canvas.width - 2 * padding;
  const plotHeight = canvas.height - 2 * padding;
  
  // Use accumulated data for better pattern visibility
  const dataToUse = accumulatedData.length > 1000 ? accumulatedData : data;
  
  // Draw axes
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, canvas.height - padding);
  ctx.lineTo(canvas.width - padding, canvas.height - padding);
  ctx.stroke();
  
  // Draw grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const x = padding + (i * plotWidth / 4);
    const y = padding + (i * plotHeight / 4);
    
    ctx.beginPath();
    ctx.moveTo(x, padding);
    ctx.lineTo(x, canvas.height - padding);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(canvas.width - padding, y);
    ctx.stroke();
  }
  
  // Draw points
  for (let i = 0; i < dataToUse.length - 1; i += 2) {
    const x = padding + (dataToUse[i] / 255) * plotWidth;
    const y = canvas.height - padding - (dataToUse[i + 1] / 255) * plotHeight;
    
    const hue = (i / dataToUse.length) * 360;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 3);
    gradient.addColorStop(0, `hsla(${hue}, 80%, 60%, 0.9)`);
    gradient.addColorStop(1, `hsla(${hue}, 80%, 40%, 0.3)`);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Draw labels
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = '12px Inter';
  ctx.textAlign = 'center';
  ctx.fillText('0', padding, canvas.height - padding + 20);
  ctx.fillText('255', canvas.width - padding, canvas.height - padding + 20);
  ctx.save();
  ctx.translate(15, canvas.height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Byte Value (Y)', 0, 0);
  ctx.restore();
  ctx.fillText('Byte Value (X)', canvas.width / 2, canvas.height - 10);
}

function drawColorGrid(data) {
  const gridSize = Math.ceil(Math.sqrt(data.length));
  const cellSize = Math.min(canvas.width, canvas.height) / gridSize;
  const offsetX = (canvas.width - gridSize * cellSize) / 2;
  const offsetY = (canvas.height - gridSize * cellSize) / 2;
  
  for (let i = 0; i < data.length; i++) {
    const row = Math.floor(i / gridSize);
    const col = i % gridSize;
    
    const x = offsetX + col * cellSize;
    const y = offsetY + row * cellSize;
    
    // Create color from random byte
    const byte = data[i];
    const hue = (byte / 255) * 360;
    const saturation = 60 + (byte % 40);
    const lightness = 40 + (byte % 30);
    
    ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    ctx.fillRect(x, y, cellSize - 1, cellSize - 1);
    
    // Add subtle glow effect
    if (byte > 200) {
      ctx.shadowBlur = 10;
      ctx.shadowColor = `hsla(${hue}, 100%, 70%, 0.5)`;
      ctx.fillRect(x, y, cellSize - 1, cellSize - 1);
      ctx.shadowBlur = 0;
    }
  }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (animationId) {
    clearTimeout(animationId);
  }
});
