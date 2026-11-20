import { createHash, randomBytes } from 'node:crypto';

export const STREAM_TICKET_TTL_MS = 60_000;

export interface StreamTicketStoreOptions {
  ttlMs?: number;
  maxEntries?: number;
  now?: () => number;
}

export interface StreamTicketStore {
  issue(jobId: string): string;
  consume(jobId: string, ticket: string): boolean;
  size(): number;
  prune(): number;
}

/**
 * One-use, short-lived credentials for EventSource clients.
 * Expired tickets are pruned on issue; the store also has a hard capacity so
 * abandoned tickets cannot grow memory without bound.
 */
export function createStreamTicketStore(options: StreamTicketStoreOptions = {}): StreamTicketStore {
  const ttlMs = Math.max(1_000, Math.floor(options.ttlMs ?? STREAM_TICKET_TTL_MS));
  const maxEntries = Math.max(1, Math.floor(options.maxEntries ?? 5_000));
  const now = options.now ?? Date.now;
  const entries = new Map<string, { jobId: string; expiresAt: number }>();

  const hash = (ticket: string) => createHash('sha256').update(ticket).digest('hex');

  const prune = (): number => {
    const currentTime = now();
    let removed = 0;
    for (const [key, entry] of entries) {
      if (entry.expiresAt <= currentTime) {
        entries.delete(key);
        removed += 1;
      }
    }
    return removed;
  };

  return {
    issue(jobId: string): string {
      if (!jobId || typeof jobId !== 'string') throw new Error('A valid job ID is required for a stream ticket.');
      prune();
      while (entries.size >= maxEntries) {
        const oldestKey = entries.keys().next().value;
        if (!oldestKey) break;
        entries.delete(oldestKey);
      }
      const ticket = randomBytes(32).toString('base64url');
      entries.set(hash(ticket), { jobId, expiresAt: now() + ttlMs });
      return ticket;
    },

    consume(jobId: string, ticket: string): boolean {
      if (!jobId || !ticket) return false;
      const key = hash(ticket);
      const entry = entries.get(key);
      if (entry) entries.delete(key);
      return Boolean(entry && entry.jobId === jobId && entry.expiresAt > now());
    },

    size(): number {
      return entries.size;
    },

    prune
  };
}
