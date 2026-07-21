// Node >= 22 defines a global `localStorage` accessor that resolves to `undefined`
// unless the process is started with `--localstorage-file`. Because the global
// already exists, the jsdom test environment skips installing its own
// implementation, leaving `localStorage` unusable. Provide an in-memory
// `Storage` for the tests that need it.
class InMemoryStorage implements Storage {
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

if (!globalThis.localStorage) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new InMemoryStorage(),
    configurable: true,
    writable: true,
  });
}
