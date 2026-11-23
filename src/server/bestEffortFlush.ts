export interface BestEffortFlushOptions {
  delayMs?: number;
  onError?: (error: unknown) => void;
}

/** Coalesces frequent updates while allowing critical callers to flush immediately. */
export class BestEffortFlush {
  private timer: NodeJS.Timeout | undefined;
  private activeFlush: Promise<void> | undefined;
  private dirty = false;

  constructor(
    private readonly flush: () => Promise<void>,
    private readonly options: BestEffortFlushOptions = {}
  ) {}

  schedule(): void {
    this.dirty = true;
    if (this.timer || this.activeFlush) return;
    this.armTimer();
  }

  private armTimer(): void {
    if (this.timer || this.activeFlush || !this.dirty) return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.runFlush();
    }, this.options.delayMs ?? 50);
  }

  private async runFlush(): Promise<void> {
    if (!this.dirty || this.activeFlush) return;
    this.dirty = false;
    this.activeFlush = Promise.resolve()
      .then(() => this.flush())
      .then(
        () => undefined,
        (error: unknown) => {
          this.dirty = true;
          try {
            this.options.onError?.(error);
          } catch {
            // Error reporting must never create an unhandled rejection.
          }
        }
      )
      .finally(() => {
        this.activeFlush = undefined;
        this.armTimer();
      });
    await this.activeFlush;
  }

  async flushNow(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    if (this.activeFlush) {
      await this.activeFlush;
    }
    if (this.dirty) {
      await this.runFlush();
    } else {
      await this.flush();
    }
  }
}
