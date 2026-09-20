/** Coalesce concurrent reads only. Results are never cached after settlement. */
export function createInFlightReadPool() {
  const pending = new Map<string, Promise<unknown>>();
  function read<T>(key: string, load: () => Promise<T>): Promise<T> {
    const existing = pending.get(key);
    if (existing) return existing as Promise<T>;
    const request = load();
    pending.set(key, request);
    const cleanup = () => { if (pending.get(key) === request) pending.delete(key); };
    void request.then(cleanup, cleanup);
    return request;
  }
  return Object.assign(read, { clear: () => pending.clear() });
}
