/** Open an SSE connection using a one-use ticket obtained with authenticated fetch. */
export async function openJobEventSource(jobId: string): Promise<EventSource> {
  const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/stream-ticket`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
    cache: 'no-store'
  });
  if (!response.ok) throw new Error('Nie udało się autoryzować strumienia zadania.');
  const data = await response.json() as { ticket?: string };
  if (!data.ticket) throw new Error('Serwer nie zwrócił biletu do strumienia.');
  return new EventSource(`/api/jobs/${encodeURIComponent(jobId)}/stream?ticket=${encodeURIComponent(data.ticket)}`);
}
