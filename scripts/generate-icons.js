import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function createCRC32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
}

const crcTable = createCRC32Table();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function writeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcData = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(crcData);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function generatePNG(width, height, isMaskable = false) {
  // RGBA buffer with filter bytes per scanline
  const scanlineLength = 1 + width * 4;
  const rawData = Buffer.alloc(scanlineLength * height);

  const bgR = 15, bgG = 23, bgB = 42; // #0f172a (dark slate / obsidian)
  const brandR = 59, brandG = 130, brandB = 246; // #3b82f6 (vibrant blue)
  const accentR = 99, accentG = 102, accentB = 241; // #6366f1 (indigo)
  const lightR = 248, lightG = 250, lightB = 252; // #f8fafc (white-ish)

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * (isMaskable ? 0.38 : 0.42);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      // Base background
      let r = bgR;
      let g = bgG;
      let b = bgB;
      let a = 255;

      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Icon graphic: stylized layered Project OS monogram "P" and "O" geometric box
      // Rounded square badge inside
      const boxSize = width * (isMaskable ? 0.28 : 0.32);
      const inBox = Math.abs(dx) <= boxSize && Math.abs(dy) <= boxSize;
      
      if (inBox) {
        // Gradient inner square
        const t = (x - (cx - boxSize)) / (2 * boxSize);
        r = Math.round(brandR + (accentR - brandR) * t);
        g = Math.round(brandG + (accentG - brandG) * t);
        b = Math.round(brandB + (accentB - brandB) * t);

        // Grid/architecture lines in icon
        const isBorder = Math.abs(Math.abs(dx) - boxSize) < (width * 0.015) || Math.abs(Math.abs(dy) - boxSize) < (height * 0.015);
        const isCrossX = Math.abs(dx) < (width * 0.02) && Math.abs(dy) < boxSize * 0.7;
        const isCrossY = Math.abs(dy) < (height * 0.02) && Math.abs(dx) < boxSize * 0.7;

        if (isBorder || isCrossX || isCrossY) {
          r = lightR;
          g = lightG;
          b = lightB;
        }
      }

      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression method
  ihdrData[11] = 0; // filter method
  ihdrData[12] = 0; // interlace method

  const ihdrChunk = writeChunk('IHDR', ihdrData);
  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = writeChunk('IDAT', compressed);
  const iendChunk = writeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generatePNG(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generatePNG(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), generatePNG(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generatePNG(180, 180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), generatePNG(64, 64, false));

console.log('PWA PNG icons generated successfully!');
