/**
 * Generates the PWA icon set as raw PNGs (no image dependencies).
 * Original artwork: a pink ring, an acid slash and gold turnbuckles.
 * Run: node scripts/gen-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = 'public/assets/branding';

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = c ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

const hex = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];

function render(size) {
  const buf = Buffer.alloc(size * size * 4);
  const bg = hex(0x0a0410);
  const pink = hex(0xff2d95);
  const acid = hex(0xb6ff3a);
  const gold = hex(0xffd23f);
  const put = (x, y, c, a = 255) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    const na = a / 255;
    buf[i] = buf[i] * (1 - na) + c[0] * na;
    buf[i + 1] = buf[i + 1] * (1 - na) + c[1] * na;
    buf[i + 2] = buf[i + 2] * (1 - na) + c[2] * na;
    buf[i + 3] = 255;
  };

  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) put(x, y, bg);

  const m = size * 0.16;
  const t = Math.max(2, size * 0.055);
  // ring ropes: three nested squares
  for (let k = 0; k < 3; k++) {
    const off = m + k * size * 0.085;
    const col = [pink, acid, gold][k];
    for (let y = off; y < size - off; y++) {
      for (let d = 0; d < t; d++) {
        put(Math.round(off + d), Math.round(y), col);
        put(Math.round(size - off - d - 1), Math.round(y), col);
      }
    }
    for (let x = off; x < size - off; x++) {
      for (let d = 0; d < t; d++) {
        put(Math.round(x), Math.round(off + d), col);
        put(Math.round(x), Math.round(size - off - d - 1), col);
      }
    }
  }
  // diagonal slash
  const sw = size * 0.115;
  for (let y = 0; y < size; y++) {
    const cx = size * 0.5 + (y - size * 0.5) * 0.62;
    for (let x = cx - sw; x < cx + sw; x++) put(Math.round(x), y, acid);
  }
  // gold turnbuckles
  const r = size * 0.075;
  for (const [cx, cy] of [[m, m], [size - m, m], [m, size - m], [size - m, size - m]]) {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      if (x * x + y * y <= r * r) put(Math.round(cx + x), Math.round(cy + y), gold);
    }
  }
  return png(size, size, buf);
}

mkdirSync(OUT, { recursive: true });
for (const s of [180, 192, 512]) {
  writeFileSync(`${OUT}/icon-${s}.png`, render(s));
  console.log(`wrote ${OUT}/icon-${s}.png`);
}

writeFileSync(`${OUT}/favicon.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#0a0410"/>
  <rect x="10" y="10" width="44" height="44" fill="none" stroke="#ff2d95" stroke-width="4"/>
  <rect x="15" y="15" width="34" height="34" fill="none" stroke="#b6ff3a" stroke-width="3"/>
  <path d="M38 6 L26 58" stroke="#b6ff3a" stroke-width="8"/>
  <g fill="#ffd23f"><circle cx="10" cy="10" r="5"/><circle cx="54" cy="10" r="5"/><circle cx="10" cy="54" r="5"/><circle cx="54" cy="54" r="5"/></g>
</svg>
`);
console.log(`wrote ${OUT}/favicon.svg`);
