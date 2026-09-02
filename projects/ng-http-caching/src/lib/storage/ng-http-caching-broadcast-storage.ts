import { NgHttpCachingMemoryStorage } from './ng-http-caching-memory-storage';
import { NgHttpCachingEntry } from '../ng-http-caching.service';

export const NG_HTTP_CACHING_BROADCAST_CHANNEL = 'ng-http-caching';

export interface NgHttpCachingBroadcastStorageOptions {
  /**
   * Name of the `BroadcastChannel` the tabs talk on.
   * Default `ng-http-caching`. Change it to keep two applications of the same origin
   * from invalidating each other.
   */
  channel?: string;
}

/**
 * The orders travelling between the tabs. Only orders: no response ever leaves a tab,
 * so nothing has to be serializable and no data is shared.
 */
interface NgHttpCachingBroadcastMessage {
  op: 'invalidate' | 'invalidate-all';
  keys?: string[];
}

const isMessage = (data: unknown): data is NgHttpCachingBroadcastMessage => {
  if (!data || typeof data !== 'object') {
    return false;
  }
  const { op, keys } = data as NgHttpCachingBroadcastMessage;
  if (op === 'invalidate-all') {
    return true;
  }
  return op === 'invalidate' && Array.isArray(keys) && keys.every((k) => typeof k === 'string');
};

/**
 * An in-memory cache store that tells the other tabs when an entry stops being good.
 *
 * The persistent stores (`localStorage`, `sessionStorage`) are already shared by every tab
 * of the origin, so a tab sees what the others write. An in-memory store isn't: a mutation
 * in one tab used to leave all the others serving the old response for a whole `lifetime`.
 *
 * What travels is only the order, never the response. And the receiving tab doesn't drop
 * its entry, it marks it invalidated: the next read serves it and refreshes it in
 * background, so an eviction happening in another tab can never empty this one.
 *
 * Not started outside of a browser, so the requests rendered on the server, which share
 * one process, don't invalidate each other.
 */
export class NgHttpCachingBroadcastStorage extends NgHttpCachingMemoryStorage {
  private readonly channel: BroadcastChannel | undefined;

  constructor(options: NgHttpCachingBroadcastStorageOptions = {}) {
    super();
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
      return;
    }
    this.channel = new BroadcastChannel(options.channel ?? NG_HTTP_CACHING_BROADCAST_CHANNEL);
    this.channel.onmessage = (event: MessageEvent) => this.onMessage(event.data);
  }

  override set<K = any, T = any>(key: string, value: NgHttpCachingEntry<K, T>): this {
    super.set(key, value);
    // an entry stored as invalidated is the `mutationInvalidation: STALE` path: the other
    // tabs have to know, and it's an order, so it carries no body
    if (value.invalidated) {
      this.post({ op: 'invalidate', keys: [key] });
    }
    return this;
  }

  override delete(key: string): boolean {
    const deleted = super.delete(key);
    if (deleted) {
      this.post({ op: 'invalidate', keys: [key] });
    }
    return deleted;
  }

  override clear(): void {
    const wasEmpty = this.size === 0;
    super.clear();
    if (!wasEmpty) {
      this.post({ op: 'invalidate-all' });
    }
  }

  /**
   * Close the channel. Called by `NgHttpCachingService.ngOnDestroy()`.
   */
  destroy(): void {
    this.channel?.close();
  }

  private post(message: NgHttpCachingBroadcastMessage): void {
    if (!this.channel) {
      return;
    }
    try {
      this.channel.postMessage(message);
    } catch {
      // a tab that can't talk to the others must not break the caching for its own user
    }
  }

  private onMessage(data: unknown): void {
    if (!isMessage(data)) {
      return;
    }
    const keys = data.op === 'invalidate-all' ? Array.from(this.keys()) : (data.keys ?? []);
    for (const key of keys) {
      // `super.get`/`super.set` on purpose: going through the overrides would send the
      // order we have just received straight back to the other tabs
      const entry = super.get(key);
      // marked, not deleted: this tab keeps serving while it refreshes, and an eviction
      // decided by another tab can't empty this one
      if (entry && !entry.invalidated) {
        super.set(key, { ...entry, invalidated: true });
      }
    }
  }
}

export const withNgHttpCachingBroadcastStorage = (options?: NgHttpCachingBroadcastStorageOptions) =>
  new NgHttpCachingBroadcastStorage(options);
