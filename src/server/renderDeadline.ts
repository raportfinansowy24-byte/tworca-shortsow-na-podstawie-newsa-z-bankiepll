/** Stops the render watchdog once the render itself has reached a terminal state. */
export function clearRenderDeadline(timer: NodeJS.Timeout): void {
  clearTimeout(timer);
}

/** Clear the render watchdog before awaiting a completion callback. */
export async function runCompletionCallback<T>(timer: NodeJS.Timeout, callback: () => Promise<T>): Promise<T> {
  clearRenderDeadline(timer);
  return callback();
}
