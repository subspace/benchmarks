// tslint:disable: no-console
import * as crypto from './crypto';

const tests = 16;
const samples = 25;
const times: number[][] = [];
const piece = crypto.randomBytes(4096);
const key = crypto.randomBytes(32);
const index = 12312343;

for (let r = 128; r <= tests * 128; r += 128) {
  let totalEncodeTime = 0;
  let totalDecodeTime = 0;

  for (let s = 0; s < samples; ++s) {
    const encodeStart = Date.now();
    const encoding = crypto.encode(piece, index, key, r);
    const encodeTime = Date.now() - encodeStart;
    console.log(`For ${r} rounds, encode time is ${encodeTime} ms`);
    totalEncodeTime += encodeTime;

    const decodeStart = Date.now();
    crypto.decode(encoding, index, key, r);
    const decodeTime = Date.now() - decodeStart;
    console.log(`For ${r} rounds, decode time is ${decodeTime} ms`);
    totalDecodeTime += decodeTime;
  }

  const averageEncodeTime = totalEncodeTime / samples;
  const averageDecodeTime = totalDecodeTime / samples;
  times.push([averageEncodeTime, averageDecodeTime]);
}

for (let t = 0; t < tests; ++t) {
  console.log(`\nFor ${(t + 1) * 128} rounds:`);
  console.log(`Average encoding time is ${times[t][0]} ms`);
  console.log(`Average decoding time is ${times[t][1]} ms`);
}
