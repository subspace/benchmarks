 // tslint:disable: no-console
import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import * as crypto from './crypto';

// ToDo
 // derive reference piece deterministically
 // evaluate many challenges and solve from this plot
 // encode in parallel with threads (Nazar)
 // encode in parallel with GPU.js (Nazar)
 // extend with simple network

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
const rounds = 384;

const storageDir = process.argv[2];

let storagePath: string;
// tslint:disable-next-line: prefer-conditional-expression
if (storageDir) {
  storagePath = path.normalize(storageDir);
} else {
  storagePath = path.normalize('./results/plot.bin');
}

export async function plot(): Promise<void> {
  // allocate empty file for contiguous plot
  const allocateStart = process.hrtime.bigint();
  const fileHandle = await fs.promises.open(storagePath, 'w');
  let written = 0;
  const emptyPiece = Buffer.alloc(pieceSize);

  while (written < plotSize) {
    await fileHandle.write(emptyPiece);
    written += pieceSize;
  }

  await fileHandle.close();
  const allocateTime = process.hrtime.bigint() - allocateStart;
  console.log(`Allocated empty file for ${plotSize} byte plot in ${allocateTime} ns\n`);

  // encode and write pieces
  const plot = await fs.promises.open(storagePath, 'r+');
  const plotStart = process.hrtime.bigint();

  for (let i = 0; i < pieceCount; ++i) {
    const encoding = crypto.encode(piece, i, key, rounds);
    await plot.write(encoding, 0, pieceSize, i * pieceSize);
  }

  const plotTime = process.hrtime.bigint() - plotStart;
  const pieceTime = plotTime / BigInt(pieceCount);
  const totalTime = plotTime + allocateTime;
  console.log(`Total plotting time is ${totalTime} ns`);
  console.log(`Average piece plotting time is ${pieceTime} ns`);
}

plot();
