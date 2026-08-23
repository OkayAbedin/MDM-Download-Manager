import { Transform, TransformCallback } from 'stream';

export class RateLimiterStream extends Transform {
  private bytesPerSecond: number;
  private tokens: number;
  private lastCheck: number;

  constructor(bytesPerSecond: number) {
    super();
    this.bytesPerSecond = bytesPerSecond;
    this.tokens = bytesPerSecond;
    this.lastCheck = Date.now();
  }

  setLimit(bytesPerSecond: number) {
    this.bytesPerSecond = bytesPerSecond;
    if (this.tokens > bytesPerSecond) {
      this.tokens = bytesPerSecond;
    }
  }

  _transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback): void {
    if (this.bytesPerSecond <= 0) {
      // Unlimited
      this.push(chunk);
      callback();
      return;
    }

    const now = Date.now();
    const elapsed = (now - this.lastCheck) / 1000;
    this.lastCheck = now;

    // Refill tokens
    this.tokens = Math.min(this.bytesPerSecond, this.tokens + elapsed * this.bytesPerSecond);

    const chunkSize = chunk.length;

    if (this.tokens >= chunkSize) {
      this.tokens -= chunkSize;
      this.push(chunk);
      callback();
    } else {
      // Need to wait for tokens
      const needed = chunkSize - this.tokens;
      const waitMs = Math.ceil((needed / this.bytesPerSecond) * 1000);
      
      setTimeout(() => {
        this.tokens = 0;
        this.lastCheck = Date.now();
        this.push(chunk);
        callback();
      }, Math.max(10, waitMs));
    }
  }
}
