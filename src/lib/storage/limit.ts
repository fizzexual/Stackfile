import { Transform } from "node:stream";

export class MaxSizeExceededError extends Error {
  constructor() {
    super("Maximum size exceeded");
    this.name = "MaxSizeExceededError";
  }
}

/**
 * A pass-through stream that errors once more than `maxBytes` have flowed
 * through it — bounds how much an upload can write to disk.
 */
export function byteLimit(maxBytes: number): Transform {
  let total = 0;
  return new Transform({
    transform(chunk: Buffer, _enc, cb) {
      total += chunk.length;
      if (total > maxBytes) {
        cb(new MaxSizeExceededError());
        return;
      }
      cb(null, chunk);
    },
  });
}
