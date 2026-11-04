// Generiert alle App-Icons (Favicon, PWA, Apple-Touch) aus einer einzigen Quell-PNG.
// Quelle: public/images/dvn-logo.png  (quadratisches DVN-Logo)
// Aufruf:  node scripts/generate-logo-icons.mjs
// Benötigt: sharp (ist Projekt-Abhängigkeit).
import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'public/images/dvn-logo.png');
const iconsDir = path.join(root, 'public/icons');
mkdirSync(iconsDir, { recursive: true });

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

// Rendert das Logo zentriert (fit: contain) auf eine quadratische Fläche der Kantenlänge `size`.
// `scale` < 1 lässt Rand (z. B. maskable Safe-Zone); `bg` ist die Hintergrundfarbe.
async function render(size, bg, scale) {
  const inner = Math.max(1, Math.round(size * scale));
  const logo = await sharp(SRC)
    .resize(inner, inner, { fit: 'contain', background: TRANSPARENT })
    .png()
    .toBuffer();
  return await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toBuffer();
}

// Baut eine .ico-Datei aus mehreren PNG-Buffern (PNG-komprimiertes ICO, von allen modernen Browsern unterstützt).
function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(entries.length, 4);
  const dir = Buffer.alloc(entries.length * 16);
  let offset = 6 + entries.length * 16;
  entries.forEach((e, i) => {
    const o = i * 16;
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, o + 0); // width
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, o + 1); // height
    dir.writeUInt8(0, o + 2); // color count
    dir.writeUInt8(0, o + 3); // reserved
    dir.writeUInt16LE(1, o + 4); // planes
    dir.writeUInt16LE(32, o + 6); // bpp
    dir.writeUInt32LE(e.data.length, o + 8); // bytes
    dir.writeUInt32LE(offset, o + 12); // offset
    offset += e.data.length;
  });
  return Buffer.concat([header, dir, ...entries.map((e) => e.data)]);
}

const meta = await sharp(SRC).metadata();
console.log(`Quelle: ${SRC}  (${meta.width}x${meta.height}, ${meta.channels} Kanäle)`);

const outputs = [
  // PWA / Favicon "any": transparenter Hintergrund, Logo füllt die Fläche.
  { file: 'public/icons/icon-192.png', buf: await render(192, TRANSPARENT, 1) },
  { file: 'public/icons/icon-512.png', buf: await render(512, TRANSPARENT, 1) },
  // Maskable: weißer Hintergrund + Safe-Zone (Logo ~72 %), damit Masken nicht beschneiden.
  { file: 'public/icons/icon-maskable-512.png', buf: await render(512, WHITE, 0.72) },
  // Apple-Touch: iOS mag keine Transparenz -> weißer Hintergrund.
  { file: 'public/icons/apple-touch-icon.png', buf: await render(180, WHITE, 0.86) },
];

for (const o of outputs) {
  writeFileSync(path.join(root, o.file), o.buf);
  console.log(`geschrieben: ${o.file}  (${o.buf.length} Bytes)`);
}

// favicon.ico mit 16/32/48 px (transparent)
const icoSizes = [16, 32, 48];
const icoEntries = [];
for (const s of icoSizes) icoEntries.push({ size: s, data: await render(s, TRANSPARENT, 1) });
const ico = buildIco(icoEntries);
writeFileSync(path.join(root, 'src/app/favicon.ico'), ico);
console.log(`geschrieben: src/app/favicon.ico  (${ico.length} Bytes, ${icoSizes.join('/')} px)`);

console.log('Fertig.');
