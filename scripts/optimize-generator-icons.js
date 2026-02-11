#!/usr/bin/env node
/**
 * Optimize generator icons: resize to 180x180 (max @3x) and compress PNG.
 * Reduces ~22M to ~2M in app bundle.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SIZE = 180;
const DIR = path.join(__dirname, '..', 'assets', 'icons', 'generators');

async function main() {
  const files = await fs.promises.readdir(DIR);
  const pngs = files.filter((f) => f.endsWith('.png'));

  let totalBefore = 0;
  let totalAfter = 0;

  for (const name of pngs) {
    const inputPath = path.join(DIR, name);
    const stat = await fs.promises.stat(inputPath);
    totalBefore += stat.size;

    const buffer = await sharp(inputPath)
      .resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toBuffer();

    await fs.promises.writeFile(inputPath, buffer);
    totalAfter += buffer.length;
    const saved = ((1 - buffer.length / stat.size) * 100).toFixed(0);
    console.log(`${name}: ${(stat.size / 1024).toFixed(0)}K → ${(buffer.length / 1024).toFixed(0)}K (-${saved}%)`);
  }

  const savedTotal = ((1 - totalAfter / totalBefore) * 100).toFixed(0);
  console.log(`\nTotal: ${(totalBefore / 1024 / 1024).toFixed(1)}M → ${(totalAfter / 1024 / 1024).toFixed(1)}M (-${savedTotal}%)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
