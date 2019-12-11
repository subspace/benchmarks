 // tslint:disable: no-console
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from './crypto';

const plotSizes = [
  1048576,        // 1 MB
  104857600,      // 100 MB
  1073741824,     // 1 GB
  10737418240,    // 10 GB
  107374182400,   // 100 GB
  1073741824000,  // 1 TB
];

const pieceSize = 4096;
const plotSize = plotSizes[2];
const pieceCount = plotSize / pieceSize;

const piece = crypto.randomBytes(pieceSize); // 4 KB
const key = crypto.randomBytes(32); // 32 Bytes
const rounds = 128;

export async function plot(): Promise<void> {
  // allocate empty file for contiguous plot
  const allocateStart = Date.now();
  const filePath = path.normalize('./results/plot.bin');
  const fileHandle = await fs.promises.open(filePath, 'w');
  let written = 0;
  const emptyPiece = Buffer.alloc(pieceSize);

  while (written < plotSize) {
    await fileHandle.write(emptyPiece);
    written += pieceSize;
  }

  await fileHandle.close();
  const allocateTime = Date.now() - allocateStart;
  console.log(`Allocated empty file for plot in ${allocateTime / 1000} seconds\n`);

  // encode and write pieces
  const plot = await fs.promises.open(filePath, 'r+');
  const plotStart = Date.now();

  for (let i = 0; i < pieceCount; ++i) {
    const encoding = crypto.encode(piece, i, key, rounds);
    await plot.write(encoding, 0, pieceSize, i * pieceSize);
    console.log(`Plotted piece at index ${i}`);
  }

  const plotTime = Date.now() - plotStart;
  const pieceTime = plotTime / pieceCount;
  const totalTime = plotTime + allocateTime;
  console.log(`\n\nTotal plotting time is ${totalTime / 1000 / 60} minutes`);
  console.log(`Average piece plotting time is ${pieceTime} ms`);
}

plot();
