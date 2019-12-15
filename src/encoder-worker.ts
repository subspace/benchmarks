import * as process from 'process';
import { isMainThread, parentPort, workerData } from 'worker_threads';
import * as crypto from './crypto';

if (isMainThread) {
  // tslint:disable-next-line:no-console
  console.error("This script is not supposed to run standalone!");
  process.exit(1);
} else if (parentPort) {
  const {key, rounds}: {key: Uint8Array, rounds: number} = workerData;
  // Hack to explain to TypeScript that it is not null
  ((parentPort) => {
    parentPort.postMessage('ready');
    parentPort.on('message', (data: {piece: Uint8Array, iv: number}) => {
      const encoding = crypto.encode(data.piece, data.iv, key, rounds);
      parentPort.postMessage(encoding, [encoding.buffer]);
    });
  })(parentPort);
}
