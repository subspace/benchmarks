// tslint:disable: no-console
// tslint:disable: prefer-conditional-expression

import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import * as crypto from './crypto';

// ToDo
  // clean up code
  // generate proof and verify
  // encode in parallel with threads (Nazar)
  // encode in parallel with GPU.js (Nazar)
  // add a simple ledger for testing forks
  // add in multiple nodes/farmers as separate processes
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
const plotSize = plotSizes[2];
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

class BatchWriter {
  // Number of elements in buffer for 2M size
  private readonly bufferSizeToFlush = 2 * 1024 * 1024 / pieceSize;
  private writeBufferStartPosition: number | null = null;
  private writeBuffer: Uint8Array[] = [];

  constructor(private readonly handle: fs.promises.FileHandle) {
  }

  public async write(encoding: Uint8Array, position: number): Promise<void> {
    if (this.writeBufferStartPosition === null) {
      this.writeBufferStartPosition = position;
    }
    this.writeBuffer.push(encoding);
    const bufferSize = this.writeBuffer.length;
    if (bufferSize === this.bufferSizeToFlush) {
      await this.flush();
    }
  }
  public async flush(): Promise<void> {
    const bufferSize = this.writeBuffer.length;
    const position = this.writeBufferStartPosition;
    if (!bufferSize || position === null) {
      return;
    }
    const bufferToWrite = this.writeBuffer;
    this.writeBuffer = [];
    this.writeBufferStartPosition = null;
    await this.handle.writev(bufferToWrite, position);
  }
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
  const batchwriter = new BatchWriter(plot);
  const plotStart = process.hrtime.bigint();

  for (let i = 0; i < pieceCount; ++i) {
    const encoding = crypto.encode(piece, i, key, rounds);
    await batchwriter.write(encoding, i * pieceSize);
  }
  await batchwriter.flush();

  const plotTime = process.hrtime.bigint() - plotStart;
  const pieceTime = plotTime / BigInt(pieceCount);
  const totalTime = plotTime + allocateTime;
  console.log(`Total plotting time is ${totalTime} ns`);
  console.log(`Average piece plotting time is ${pieceTime} ns`);

  // evaluate a set of random challenges
  const samples = 16000;
  const solveStart = process.hrtime.bigint();
  let challenge = crypto.randomBytes(32);
  let totalQuality = 0;
  for (let i = 0; i < samples; ++i) {
    const index = BigInt(crypto.bin2num32(challenge)) % BigInt(pieceCount);
    const encoding = Buffer.allocUnsafe(pieceSize);
    await plot.read(encoding, 0, pieceSize, pieceSize * Number(index));
    const tag = crypto.hash(Buffer.concat([encoding, challenge]));
    totalQuality += crypto.measureQuality(tag);
    challenge = crypto.hash(tag);
  }

  // calculate and log solve time
  const totalSolveTime = process.hrtime.bigint() - solveStart;
  const averageSolveTime = totalSolveTime / BigInt(samples);
  console.log(`\nAverage solve time is ${averageSolveTime} ns for ${samples} samples`);

  // calculate and log quality
  const averageQuality = totalQuality / samples;
  const encodingSetSize = Math.pow(2, (averageQuality - 1));
  const accuracy = 100 * ((1 - Math.abs(encodingSetSize - 1)) / 1);
  console.log(`Average quality is ${averageQuality}`);
  console.log(`Expected encoding set size is ${encodingSetSize}`);
  console.log(`Actual encoding set size is ${1}`);
  console.log(`Accuracy is ${accuracy} %`);

  // generate and verify proofs of storage
}

plot();
