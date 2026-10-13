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

function renderPwaPixel(x, y, width, height, isMaskable = false) {
  // Normalize coordinates (-1 to 1)
  const nx = (x / width) * 2 - 1;
  const ny = (y / height) * 2 - 1;

  // Squircle check (superellipse: |nx|^3.8 + |ny|^3.8 <= 1)
  const squircle = Math.pow(Math.abs(nx), 3.8) + Math.pow(Math.abs(ny), 3.8);
  if (!isMaskable && squircle > 1.0) {
    return [0, 0, 0, 0]; // Transparent outer corners for standalone
  }

  // Base Gradient (Indigo to Violet to Hot Magenta)
  const tGrad = (nx + ny + 2) / 4; // 0 to 1 across diagonal
  let r = Math.round(lerp(49, 219, Math.min(1, tGrad * 1.2)));
  let g = Math.round(lerp(46, 39, tGrad));
  let b = Math.round(lerp(129, 119, Math.min(1, tGrad)));

  // Card stack illustration coordinates
  const scale = isMaskable ? 0.72 : 0.88;
  const cx = nx / scale;
  const cy = ny / scale;

  // Front card rectangle: cx: [-0.48, 0.48], cy: [-0.55, 0.55]
  const inCardX = cx >= -0.48 && cx <= 0.48;
  const inCardY = cy >= -0.55 && cy <= 0.55;

  if (inCardX && inCardY) {
    const cornerDx = Math.max(0, Math.abs(cx) - 0.38);
    const cornerDy = Math.max(0, Math.abs(cy) - 0.45);
    const cornerDist = Math.sqrt(cornerDx * cornerDx + cornerDy * cornerDy);

    if (cornerDist < 0.1) {
      if (cy >= -0.48 && cy <= -0.15 && cx >= -0.38 && cx <= 0.38) {
        const bannerT = (cx + 0.38) / 0.76;
        r = Math.round(lerp(236, 139, bannerT));
        g = Math.round(lerp(72, 92, bannerT));
        b = Math.round(lerp(153, 246, bannerT));
      } else if (cy >= -0.05 && cy <= -0.01 && cx >= -0.38 && cx <= 0.25) {
        r = 30; g = 41; b = 59;
      } else if (cy >= 0.05 && cy <= 0.08 && cx >= -0.38 && cx <= 0.35) {
        r = 100; g = 116; b = 139;
      } else if (cy >= 0.12 && cy <= 0.15 && cx >= -0.38 && cx <= 0.3) {
        r = 148; g = 163; b = 184;
      } else if (cy >= 0.24 && cy <= 0.38 && cx >= -0.38 && cx <= -0.1) {
        r = 124; g = 58; b = 237;
      } else {
        r = 250; g = 252; b = 255;
      }
    }
  }

  // Golden Sparkle Star in top right
  const spX = Math.abs(nx - 0.55);
  const spY = Math.abs(ny - (-0.55));
  if (spX * spY < 0.008 && spX + spY < 0.22) {
    r = 254; g = 240; b = 138;
  }

  return [r, g, b, 255];
}

const iconsDir = path.join(__dirname, '..', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('Generating PWA icons...');

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
