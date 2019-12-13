// tslint:disable: no-console
// tslint:disable: prefer-conditional-expression

import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import * as crypto from './crypto';

// ToDo
 // evaluate many challenges and solve from this plot
 // encode in parallel with threads (Nazar)
 // encode in parallel with GPU.js (Nazar)
 // extend with simple network

// define constants
const plotSizes = [
  1048576,        // 1 MB
  10485760,       // 10 MB
  104857600,      // 100 MB
  1073741824,     // 1 GB
  10737418240,    // 10 GB
  107374182400,   // 100 GB
  1073741824000,  // 1 TB
];

const pieceSize = 4096;
const plotSize = plotSizes[1];
const pieceCount = plotSize / pieceSize;
const rounds = 384;

// generate a random encoding key
const key = crypto.randomBytes(32); // 32 Bytes

// deterministically derive the source piece
let seed = Uint8Array.from(Buffer.from('subspace', 'hex'));
const pieceParts: Uint8Array[] = [];
for (let i = 0; i < 127; ++i) {
  pieceParts.push(seed);
  seed = crypto.hash(seed);
}
const piece = Buffer.concat(pieceParts);

// set storage directory for plotting
const storageDir = process.argv[2];
let storagePath: string;
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

  // evaluate a set of random challenges
  const samples = 1000;
  const solveStart = process.hrtime.bigint();
  let challenge = crypto.randomBytes(32);
  for (let i = 0; i < samples; ++i) {
    const index = BigInt(crypto.bin2num32(challenge)) % BigInt(pieceCount);
    const encoding = Buffer.allocUnsafe(pieceSize);
    await plot.read(encoding, 0, pieceSize, pieceSize * Number(index));
    const tag = crypto.hash(Buffer.concat([encoding, challenge]));
    challenge = crypto.hash(tag);
  }
  const totalSolveTime = process.hrtime.bigint() - solveStart;
  const averageSolveTime = totalSolveTime / BigInt(samples);
  console.log(`\nAverage solve time is ${averageSolveTime} ns for ${samples} samples`);

  // measure quality
}

plot();
