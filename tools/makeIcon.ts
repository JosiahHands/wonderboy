// Renders the logo (app/icon.svg) into:
//   app/icon.ico  Windows icon with many sizes (app, window, installer, right-click menu)
//   app/icon.png  512px picture (README)
// Run after changing the logo: npx tsx tools/makeIcon.ts

import * as fs from "fs";
import * as path from "path";
import { Resvg } from "@resvg/resvg-js";

const appDir = path.join(__dirname, "..", "app");
const svg = fs.readFileSync(path.join(appDir, "icon.svg"), "utf8");
const SIZES = [16, 20, 24, 32, 40, 48, 64, 128, 256];

function render(size: number) {
  return new Resvg(svg, { fitTo: { mode: "width", value: size } }).render();
}

// Sizes below 256 are stored as classic bitmaps (the installer tool, NSIS, needs these).
// Bitmap = 40-byte header + BGRA pixels from the bottom row up + a 1-bit mask (all 0 = use alpha).
function bitmap(size: number): Buffer {
  const rgba = render(size).pixels;
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0); // header size
  header.writeInt32LE(size, 4); // width
  header.writeInt32LE(size * 2, 8); // height: pixels + mask
  header.writeUInt16LE(1, 12); // planes
  header.writeUInt16LE(32, 14); // bits per pixel

  const pixels = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const from = ((size - 1 - y) * size + x) * 4;
      const to = (y * size + x) * 4;
      pixels[to] = rgba[from + 2]; // blue
      pixels[to + 1] = rgba[from + 1]; // green
      pixels[to + 2] = rgba[from]; // red
      pixels[to + 3] = rgba[from + 3]; // alpha
    }
  }
  const mask = Buffer.alloc(Math.ceil(size / 32) * 4 * size);
  return Buffer.concat([header, pixels, mask]);
}

// .ico file = 6-byte header + one 16-byte entry per size + the images.
function makeIco(): Buffer {
  const images = SIZES.map((size) => (size === 256 ? render(256).asPng() : bitmap(size)));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(SIZES.length, 4);

  let offset = 6 + 16 * SIZES.length;
  const entries = SIZES.map((size, i) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size === 256 ? 0 : size, 0); // width (0 means 256)
    entry.writeUInt8(size === 256 ? 0 : size, 1); // height
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(images[i].length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += images[i].length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...images]);
}

fs.writeFileSync(path.join(appDir, "icon.ico"), makeIco());
fs.writeFileSync(path.join(appDir, "icon.png"), render(512).asPng());
console.log("Wrote app/icon.ico and app/icon.png");
