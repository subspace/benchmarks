// tslint:disable: no-console
import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import * as crypto from './crypto';

export default function encode(): void {
  const tests = 16;
  const samples = 500;
  const times: BigInt[][] = [];
  const piece = crypto.randomBytes(4096);
  const key = crypto.randomBytes(32);
  const index = 12312343;

  // Test Encode/Decode time for AES-256 within 128 round increments
  for (let r = 128; r <= tests * 128; r += 128) {
    console.log(`Testing ${r} rounds of AES-256-CBC...`);
    const encodings: Uint8Array[] = [];

    const encodeStart = process.hrtime.bigint();
    for (let s = 0; s < samples; ++s) {
      encodings.push(crypto.encode(piece, index, key, r));
    }
    const encodeTime = process.hrtime.bigint() - encodeStart;
    const averageEncodeTime = encodeTime / BigInt(samples);

    const decodeStart = process.hrtime.bigint();
    for (let s = 0; s < samples; ++s) {
      crypto.decode(encodings[s], index, key, r);
    }
    const decodeTime = process.hrtime.bigint() - decodeStart;
    const averageDecodeTime = decodeTime / BigInt(samples);

    times.push([averageEncodeTime, averageDecodeTime]);
  }

  // output the collated results to console and csv

  let csvContent = "";

  for (let t = 0; t < tests; ++t) {
    console.log(`\nFor ${(t + 1) * 128} rounds:`);
    console.log(`Average encoding time is ${BigInt(times[t][0]) / 1000000n} ms`);
    console.log(`Average decoding time is ${BigInt(times[t][1]) / 1000000n} ms`);
    csvContent += `${times[t][0]},${times[t][1]}\r\n`;
  }

  fs.writeFileSync(path.normalize('./results/encode-decode.csv'), csvContent);
}
