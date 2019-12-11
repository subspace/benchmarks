// tslint:disable: no-console
import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import * as crypto from './crypto';

const tests = 16;
const samples = 500;
const times: BigInt[][] = [];
const piece = crypto.randomBytes(4096);
const key = crypto.randomBytes(32);
const index = 12312343;

// Test Encode/Decode time for AES-256 within 128 round increments
for (let r = 128; r <= tests * 128; r += 128) {
  console.log(`Testing ${r} rounds of AES-256-CBC...`);
  let totalEncodeTime = 0n;
  let totalDecodeTime = 0n;

  // Test each increment over many samples, taking the mean
  for (let s = 0; s < samples; ++s) {
    const encodeStart = process.hrtime.bigint();
    const encoding = crypto.encode(piece, index, key, r);
    const encodeTime = process.hrtime.bigint() - encodeStart;
    // console.log(`For ${r} rounds, encode time is ${encodeTime} ms`);
    totalEncodeTime += encodeTime;

    const decodeStart = process.hrtime.bigint();
    crypto.decode(encoding, index, key, r);
    const decodeTime = process.hrtime.bigint() - decodeStart;
    // console.log(`For ${r} rounds, decode time is ${decodeTime} ms`);
    totalDecodeTime += decodeTime;
  }

  const averageEncodeTime = totalEncodeTime / BigInt(samples);
  const averageDecodeTime = totalDecodeTime / BigInt(samples);
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
