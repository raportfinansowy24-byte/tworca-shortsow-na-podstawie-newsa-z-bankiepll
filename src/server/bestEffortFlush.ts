export interface BestEffortFlushOptions {
  delayMs?: number;
}

/** Coalesces frequent updates while allowing critical callers to flush immediately. */
export class BestEffortFlush {
  private timer: NodeJS.Timeout | undefined;
  private activeFlush: Promise<void> | undefined;

  constructor(
    private readonly flush: () => Promise<void>,
    private readonly options: BestEffortFlushOptions = {}
  ) {}

  schedule(): void {
    if (this.timer || this.activeFlush) return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.activeFlush = this.flush().finally(() => {
        this.activeFlush = undefined;
      });
    }, this.options.delayMs ?? 50);
  }

  async flushNow(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    if (this.activeFlush) {
      await this.activeFlush;
    }
    await this.flush();
  }
}
