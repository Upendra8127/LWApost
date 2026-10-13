import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CRC32 implementation
function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    table[n] = c;
  }
  return table;
}

const crcTable = makeCrcTable();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcTarget = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(crcTarget);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function createPng(width, height, pixelFn) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8-bit depth
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // Deflate
  ihdrData[11] = 0; // Filter 0
  ihdrData[12] = 0; // No interlace
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Scanlines (Filter byte 0 + RGBA per pixel)
  const rowLen = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowLen);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLen;
    rawData[rowOffset] = 0; // None filter
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = pixelFn(x, y, width, height);
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  // IDAT
  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = createChunk('IDAT', compressed);

  // IEND
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Color blending helpers
function lerp(a, b, t) {
  return a + (b - a) * t;
}

// 5x7 bitmap font for "LWA"
// L: 4x5, W: 5x5, A: 4x5
function isInsideLwa(px, py) {
  // px from 0 to 22, py from 0 to 7
  // 'L' (x: 1 to 5)
  if (px >= 1 && px <= 2 && py >= 1 && py <= 7) return true;
  if (px >= 1 && px <= 6 && py >= 6 && py <= 7) return true;

  // 'W' (x: 8 to 15)
  if ((px === 8 || px === 14) && py >= 1 && py <= 6) return true;
  if ((px === 9 || px === 13) && py >= 5 && py <= 7) return true;
  if ((px === 10 || px === 12) && py >= 3 && py <= 6) return true;
  if (px === 11 && py >= 2 && py <= 4) return true;

  // 'A' (x: 17 to 22)
  if ((px >= 18 && px <= 20) && py === 1) return true;
  if ((px === 17 || px === 21) && py >= 2 && py <= 7) return true;
  if (px >= 17 && px <= 21 && (py === 4 || py === 5)) return true;

  return false;
}

function renderPwaPixel(x, y, width, height, isMaskable = false) {
  // Normalize coordinates (-1 to 1)
  const nx = (x / width) * 2 - 1;
  const ny = (y / height) * 2 - 1;

  // Squircle check
  const squircle = Math.pow(Math.abs(nx), 3.8) + Math.pow(Math.abs(ny), 3.8);
  if (!isMaskable && squircle > 1.0) {
    return [0, 0, 0, 0]; // Transparent outer corners
  }

  // Base Gradient (Deep Violet `#4f46e5` to `#7c3aed` to Hot Pink `#ec4899`)
  const tGrad = (nx + ny + 2) / 4;
  let r = Math.round(lerp(67, 236, Math.min(1, tGrad * 1.15)));
  let g = Math.round(lerp(56, 72, tGrad));
  let b = Math.round(lerp(202, 153, Math.min(1, tGrad)));

  // Ambient lighting glow circles
  const distGlow1 = Math.hypot(nx - 0.45, ny - (-0.45));
  if (distGlow1 < 0.6) {
    const glowT = (0.6 - distGlow1) / 0.6;
    r = Math.min(255, r + Math.round(glowT * 40));
    b = Math.min(255, b + Math.round(glowT * 50));
  }

  // Card stack coordinates
  const scale = isMaskable ? 0.72 : 0.86;
  const cx = nx / scale;
  const cy = ny / scale;

  // 1. Tilted Back Card (cyan-indigo accent)
  const angle = -0.18; // ~ -10 degrees
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const rx1 = cx * cosA - cy * sinA;
  const ry1 = cx * sinA + cy * cosA;
  if (Math.abs(rx1) < 0.46 && Math.abs(ry1) < 0.54) {
    const cDist = Math.hypot(Math.max(0, Math.abs(rx1) - 0.36), Math.max(0, Math.abs(ry1) - 0.44));
    if (cDist < 0.1) {
      r = 30; g = 58; b = 138; // Deep navy accent
    }
  }

  // 2. Front Hero Card (white with sleek border and shadow)
  const inCardX = cx >= -0.48 && cx <= 0.48;
  const inCardY = cy >= -0.56 && cy <= 0.56;

  if (inCardX && inCardY) {
    const cornerDx = Math.max(0, Math.abs(cx) - 0.38);
    const cornerDy = Math.max(0, Math.abs(cy) - 0.46);
    const cornerDist = Math.hypot(cornerDx, cornerDy);

    if (cornerDist < 0.1) {
      // Inside Front Card
      // Top story bars
      if (cy >= -0.52 && cy <= -0.49 && Math.abs(cx) <= 0.4) {
        if (cx < -0.15) { r = 236; g = 72; b = 153; } // Hot pink active
        else if (cx < 0.1) { r = 139; g = 92; b = 246; } // Violet
        else { r = 203; g = 213; b = 225; } // Slate
      }
      // Upper Card Banner (Gradient Violet-Pink)
      else if (cy >= -0.46 && cy <= -0.15 && Math.abs(cx) <= 0.4) {
        const bT = (cx + 0.4) / 0.8;
        r = Math.round(lerp(236, 124, bT));
        g = Math.round(lerp(72, 58, bT));
        b = Math.round(lerp(153, 237, bT));

        // Open Book Vector shape in banner
        const bx = Math.abs(cx);
        const by = cy - (-0.3);
        if (bx < 0.22 && by > -0.09 && by < 0.09) {
          if (Math.abs(by - 0.02 * bx) < 0.04) {
            r = 255; g = 255; b = 255;
          }
        }
      }
      // "LWA" Bold Monogram in Card Center
      else if (cy >= -0.06 && cy <= 0.22 && Math.abs(cx) <= 0.42) {
        // Map cx [-0.38, 0.38], cy [-0.04, 0.20] to 23x8 pixel grid
        const gridX = Math.floor(((cx + 0.38) / 0.76) * 23);
        const gridY = Math.floor(((cy - (-0.04)) / 0.24) * 8);

        if (gridX >= 0 && gridX < 23 && gridY >= 0 && gridY < 8 && isInsideLwa(gridX, gridY)) {
          r = 15; g = 23; b = 42; // Bold dark navy letters "LWA"
        } else {
          r = 255; g = 255; b = 255; // White background
        }
      }
      // Bottom pill button (Gradient Indigo-Violet)
      else if (cy >= 0.32 && cy <= 0.46 && cx >= -0.38 && cx <= 0.1) {
        r = 124; g = 58; b = 237;
      }
      // Little check circle
      else if (Math.hypot(cx - 0.26, cy - 0.39) < 0.08) {
        r = 16; g = 185; b = 129; // Emerald check
      }
      else {
        // Crisp white card surface
        r = 255; g = 255; b = 255;
      }
    }
  }

  // Golden Sparkle Star in top-right (✦)
  const spX = Math.abs(nx - 0.54);
  const spY = Math.abs(ny - (-0.54));
  if (spX * spY < 0.009 && spX + spY < 0.24) {
    r = 254; g = 240; b = 138; // Golden sparkle
  }

  return [r, g, b, 255];
}

const iconsDir = path.join(__dirname, '..', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('Generating ultra-crisp PWA icons with bold LWA branding...');

// 1. icon-192.png
const png192 = createPng(192, 192, (x, y, w, h) => renderPwaPixel(x, y, w, h, false));
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), png192);
console.log('✓ Created icons/icon-192.png');

// 2. icon-512.png
const png512 = createPng(512, 512, (x, y, w, h) => renderPwaPixel(x, y, w, h, false));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), png512);
console.log('✓ Created icons/icon-512.png');

// 3. icon-maskable.png (with safe margin)
const pngMaskable = createPng(512, 512, (x, y, w, h) => renderPwaPixel(x, y, w, h, true));
fs.writeFileSync(path.join(iconsDir, 'icon-maskable.png'), pngMaskable);
console.log('✓ Created icons/icon-maskable.png');

// 4. apple-touch-icon.png (180x180)
const pngApple = createPng(180, 180, (x, y, w, h) => renderPwaPixel(x, y, w, h, false));
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), pngApple);
console.log('✓ Created icons/apple-touch-icon.png');

console.log('All PWA icons generated successfully!');
