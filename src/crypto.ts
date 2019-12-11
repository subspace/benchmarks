import * as crypto from 'crypto';

function num2bin16(num: number): Uint8Array {
  const arr = new ArrayBuffer(16);
  const view = new DataView(arr);
  view.setUint32(0, num, false);
  return new Uint8Array(arr);
}

export function randomBytes(length: number): Uint8Array {
  return new Uint8Array(crypto.randomBytes(length));
}

export function hash(data: Uint8Array, outputLength = 32, type = 'sha256'): Uint8Array {
  const hasher = crypto.createHash(type);
  hasher.update(data);
  let hash = new Uint8Array(hasher.digest());
  hash = hash.subarray(0, outputLength);
  return hash;
}

export function encode(piece: Uint8Array, index: number, key: Uint8Array, rounds: number): Uint8Array {
  const iv = num2bin16(index);
  let encoding = piece;
  for (let r = 0; r < rounds; ++r) {
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const cipherText = cipher.update(encoding);
    encoding = Buffer.concat([cipherText, cipher.final()]);
  }
  return encoding;
}

export function decode(encoding: Uint8Array, index: number, key: Uint8Array, rounds: number): Uint8Array {
  const iv = num2bin16(index);
  let piece = encoding;
  for (let r = 0; r < rounds; ++r) {
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const plainText = decipher.update(piece);
    piece = Buffer.concat([plainText, decipher.final()]);
  }
  return piece;
}