const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZE = 81;
const OUTPUT_DIR = path.join(__dirname, 'assets', 'icons');

function drawUserIcon(color) {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');

  // Transparent background (default)
  ctx.clearRect(0, 0, SIZE, SIZE);

  // Style settings
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // --- Head (circle) ---
  // Center the head in the upper portion
  const headCenterX = SIZE / 2;       // 40.5
  const headCenterY = SIZE * 0.32;    // ~26
  const headRadius = SIZE * 0.17;     // ~13.8

  ctx.beginPath();
  ctx.arc(headCenterX, headCenterY, headRadius, 0, Math.PI * 2);
  ctx.fill();

  // --- Body (shoulder arc) ---
  // A wide arc below the head representing shoulders/torso
  const bodyCenterX = SIZE / 2;       // 40.5
  const bodyCenterY = SIZE * 0.82;    // ~66.4
  const bodyRadiusX = SIZE * 0.38;    // ~30.8
  const bodyRadiusY = SIZE * 0.32;    // ~25.9

  ctx.beginPath();
  ctx.ellipse(bodyCenterX, bodyCenterY, bodyRadiusX, bodyRadiusY, 0, Math.PI, 0, true);
  ctx.fill();

  return canvas;
}

// Generate mine.png (gray #999999)
const grayCanvas = drawUserIcon('#999999');
const grayPng = grayCanvas.toBuffer('image/png');
fs.writeFileSync(path.join(OUTPUT_DIR, 'mine.png'), grayPng);
console.log('Generated: mine.png (gray #999999, 81x81)');

// Generate mine-active.png (blue #1890FF)
const blueCanvas = drawUserIcon('#1890FF');
const bluePng = blueCanvas.toBuffer('image/png');
fs.writeFileSync(path.join(OUTPUT_DIR, 'mine-active.png'), bluePng);
console.log('Generated: mine-active.png (blue #1890FF, 81x81)');

console.log('Done! Both icons have been generated.');
