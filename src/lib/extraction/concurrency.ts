/**
 * Concurrency limiter for file extraction.
 *
 * Limits parallel extractions to prevent memory overflow when
 * processing large files (PDF, Excel) concurrently.
 * Default maxConcurrency is 2 (conservative per RESEARCH.md Open Question 2).
 */

export class ExtractionSemaphore {
  private queue: (() => void)[] = [];
  private active = 0;

  constructor(private maxConcurrency: number = 2) {}

  async acquire(): Promise<void> {
    if (this.active < this.maxConcurrency) {
      this.active++;
      return;
    }
    return new Promise<void>(resolve => this.queue.push(resolve));
  }

  release(): void {
    this.active--;
    const next = this.queue.shift();
    if (next) {
      this.active++;
      next();
    }
  }
}

/** Singleton semaphore instance for extraction coordination. */
export const extractionSemaphore = new ExtractionSemaphore(2);
