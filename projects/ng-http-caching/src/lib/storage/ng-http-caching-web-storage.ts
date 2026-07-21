/**
 * Minimal in-memory implementation of the Web Storage API.
 *
 * It is used as a fallback whenever the real `localStorage`/`sessionStorage` can't be
 * reached: server side rendering, sandboxed iframes, or storage disabled by the user.
 * Being a per-instance store, on the server it also keeps the cache isolated between
 * the rendered requests, instead of persisting anything.
 */
export class NgHttpCachingInMemoryWebStorage implements Storage {
  private readonly entries = new Map<string, string>();

  get length(): number {
    return this.entries.size;
  }

  key(index: number): string | null {
    return Array.from(this.entries.keys())[index] ?? null;
  }

  getItem(key: string): string | null {
    return this.entries.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.entries.set(key, String(value));
  }

  removeItem(key: string): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }

  [name: string]: any;
}

export type NgHttpCachingWebStorageKind = 'localStorage' | 'sessionStorage';

const PROBE_KEY = 'NgHttpCaching::probe';

/**
 * Return the requested Web Storage, or an in-memory fallback when it isn't usable.
 *
 * This keeps the library safe to bootstrap outside of a browser (server side rendering,
 * prerendering, unit tests) where the global is missing or, on Node >= 22, exists but
 * resolves to `undefined`.
 */
export const getWebStorage = (kind: NgHttpCachingWebStorageKind): Storage => {
  try {
    const storage = (globalThis as Partial<Record<NgHttpCachingWebStorageKind, Storage>>)[kind];
    if (storage) {
      // Safari in private mode, and browsers configured to block storage, expose the
      // object but throw on write: probe it before trusting it.
      storage.setItem(PROBE_KEY, '');
      storage.removeItem(PROBE_KEY);
      return storage;
    }
  } catch {
    // not usable, fall through to the in-memory fallback
  }
  return new NgHttpCachingInMemoryWebStorage();
};
