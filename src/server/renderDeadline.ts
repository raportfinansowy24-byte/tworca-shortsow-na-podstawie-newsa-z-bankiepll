/** Stops the render watchdog once the render itself has reached a terminal state. */
export function clearRenderDeadline(timer: NodeJS.Timeout): void {
  clearTimeout(timer);
}
