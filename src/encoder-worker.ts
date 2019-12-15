import * as process from 'process';
import * as crypto from './crypto';

import { isMainThread, parentPort } from 'worker_threads';

if (isMainThread) {
  // tslint:disable-next-line:no-console
  console.error("This script is not supposed to run standalone!");
  process.exit(1);
} else if (parentPort) {
  // Hack to explain to TypeScript that it is not null
  ((parentPort) => {
    parentPort.postMessage('ready');
    parentPort.on('message', (data: {piece: Uint8Array, iv: number, key: Uint8Array, rounds: number}) => {
      const encoding = crypto.encode(data.piece, data.iv, data.key, data.rounds);
      parentPort.postMessage(encoding, [encoding.buffer]);
    });
  })(parentPort);
}
