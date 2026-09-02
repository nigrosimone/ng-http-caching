import { NgHttpCachingStorageInterface } from './ng-http-caching-storage.interface';
import { NgHttpCachingEntry } from '../ng-http-caching.service';
import { HttpHeaders, HttpParams, HttpRequest, HttpResponse } from '@angular/common/http';

export const NG_HTTP_CACHING_KEY_PREFIX = 'NgHttpCaching::';

export interface NgHttpCachingStorageEntry {
  url: string;
  response: string;
  request: string;
  addedTime: number;
  freshTime?: number;
  invalidated?: boolean;
  version: string;
}

export const serializeRequest = (req: HttpRequest<any>): string => {
  const request = req.clone(); // Make a clone, useful for doing destructive things
  return JSON.stringify({
    headers: Object.fromEntries(
      // Just a helper to make this into an object, not really required but makes the output nicer
      request.headers.keys().map(
        // Get all of the headers
        (key: string) => [key, request.headers.getAll(key)], // Get all of the corresponding values for the headers
      ),
    ),
    method: request.method, // The Request Method, e.g. GET, POST, DELETE
    url: request.url, // The URL
    params: Object.fromEntries(
      // Just a helper to make this into an object, not really required but makes the output nicer
      Array.from(request.params.keys()).map((key: string) => [key, request.params.getAll(key)]),
    ), // The request parameters
    withCredentials: request.withCredentials, // Whether credentials are being sent
    responseType: request.responseType, // The response type
    body: request.serializeBody(), // Serialize the body, all well and good since we are working on a clone
  });
};

export const serializeResponse = (res: HttpResponse<any>): string => {
  const response = res.clone();
  return JSON.stringify({
    headers: Object.fromEntries(
      // Just a helper to make this into an object, not really required but makes the output nicer
      response.headers.keys().map(
        // Get all of the headers
        (key: string) => [key, response.headers.getAll(key)], // Get all of the corresponding values for the headers
      ),
    ),
    status: response.status,
    statusText: response.statusText,
    url: response.url,
    body: response.body, // Serialize the body, all well and good since we are working on a clone
  });
};

export const deserializeRequest = <T = unknown>(req: string): HttpRequest<T> => {
  const request = JSON.parse(req);
  const headers = new HttpHeaders(request.headers);
  let params = new HttpParams();
  for (const parameter in request.params) {
    for (const paramValue of request.params[parameter]) {
      params = params.append(parameter, paramValue);
    }
  }
  return new HttpRequest(request.method, request.url, request.body, {
    headers,
    params,
    responseType: request.responseType,
    withCredentials: request.withCredentials,
  });
};

export const deserializeResponse = <T = unknown>(res: string): HttpResponse<T> => {
  const response = JSON.parse(res);
  return new HttpResponse<T>({
    url: response.url,
    headers: new HttpHeaders(response.headers),
    body: response.body,
    status: response.status,
    statusText: response.statusText,
  });
};

/**
 * What to do when the browser refuses a write because the storage quota is full.
 * - `evict-oldest`: drop the oldest entries of this cache, one at a time, and retry.
 * - `clear`: drop the whole cache and retry once.
 * - `ignore`: give up on this entry and leave the cache as it is.
 */
export type NgHttpCachingQuotaStrategy = 'evict-oldest' | 'clear' | 'ignore';

export interface NgHttpCachingBrowserStorageOptions {
  /**
   * Recovery strategy when the storage quota is exceeded. Default `evict-oldest`.
   */
  onQuotaExceeded?: NgHttpCachingQuotaStrategy;
  /**
   * Maximum number of entries evicted before giving up on a write, with the
   * `evict-oldest` strategy. Default `10`.
   */
  maxQuotaRetry?: number;
  /**
   * Prefix of the keys written into the storage. Default `NgHttpCaching::`.
   * Give a different one to each application sharing the same origin, otherwise they
   * read, evict and clear each other entries.
   */
  keyPrefix?: string;
}

/**
 * Return true when the write was refused because the storage is full.
 *
 * Every browser reports it differently: `QuotaExceededError` on Chrome and Safari,
 * `NS_ERROR_DOM_QUOTA_REACHED` (code 1014) on Firefox, and some only set the legacy
 * numeric code. Checking the name alone would miss the error, and the write would be
 * silently lost while the storage stays full.
 */
export const isQuotaExceededError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const { name, code } = error as { name?: string; code?: number };
  return (
    name === 'QuotaExceededError' ||
    name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    code === 22 ||
    code === 1014
  );
};

export class NgHttpCachingBrowserStorage implements NgHttpCachingStorageInterface {
  private readonly onQuotaExceeded: NgHttpCachingQuotaStrategy;
  private readonly maxQuotaRetry: number;
  protected readonly keyPrefix: string;

  constructor(
    protected readonly storage: Storage,
    options: NgHttpCachingBrowserStorageOptions = {},
  ) {
    this.onQuotaExceeded = options.onQuotaExceeded ?? 'evict-oldest';
    this.maxQuotaRetry = options.maxQuotaRetry ?? 10;
    this.keyPrefix = options.keyPrefix ?? NG_HTTP_CACHING_KEY_PREFIX;
  }

  get size(): number {
    let count = 0;
    for (let i = 0, e = this.storage.length; i < e; i++) {
      const key = this.storage.key(i);
      if (key?.startsWith(this.keyPrefix)) {
        count++;
      }
    }
    return count;
  }

  clear(): void {
    for (let i = this.storage.length - 1; i >= 0; i--) {
      const key = this.storage.key(i);
      if (key?.startsWith(this.keyPrefix)) {
        this.storage.removeItem(key);
      }
    }
  }

  delete(key: string): boolean {
    if (!key) {
      return false;
    }
    if (!key.startsWith(this.keyPrefix)) {
      key = this.keyPrefix + key;
    }
    // report the real outcome, like `Map.delete` does
    if (this.storage.getItem(key) === null) {
      return false;
    }
    this.storage.removeItem(key);
    return true;
  }

  forEach(callbackfn: (value: NgHttpCachingEntry, key: string) => void): void {
    // snapshot the keys first: `get` drops corrupted entries and the callback may
    // delete entries too, both of which would shift the index based iteration
    const keysWithPrefix: string[] = [];
    for (let i = 0, e = this.storage.length; i < e; i++) {
      const keyWithPrefix = this.storage.key(i);
      if (keyWithPrefix?.startsWith(this.keyPrefix)) {
        keysWithPrefix.push(keyWithPrefix);
      }
    }
    for (const keyWithPrefix of keysWithPrefix) {
      const value = this.get(keyWithPrefix);
      if (value) {
        callbackfn(value, keyWithPrefix.substring(this.keyPrefix.length));
      }
    }
  }

  get(key: string): Readonly<NgHttpCachingEntry> | undefined {
    if (!key) {
      return undefined;
    }
    if (!key.startsWith(this.keyPrefix)) {
      key = this.keyPrefix + key;
    }
    const item = this.storage.getItem(key);
    if (item) {
      try {
        const parsedItem: NgHttpCachingStorageEntry = JSON.parse(item);
        return this.deserialize(parsedItem);
      } catch (e) {
        console.error('Failed to parse cached entry:', key, e);
        this.storage.removeItem(key);
        return undefined;
      }
    }
    return undefined;
  }

  has(key: string): boolean {
    if (!key) {
      return false;
    }
    if (!key.startsWith(this.keyPrefix)) {
      key = this.keyPrefix + key;
    }
    return !!this.storage.getItem(key);
  }

  set(key: string, value: NgHttpCachingEntry): void {
    if (!key) {
      return;
    }
    if (!key.startsWith(this.keyPrefix)) {
      key = this.keyPrefix + key;
    }
    let serialized: string;
    try {
      const unParsedItem: NgHttpCachingStorageEntry = this.serialize(value);
      serialized = JSON.stringify(unParsedItem);
    } catch (error) {
      console.error('Failed to serialize cache entry:', key, error);
      return;
    }

    // `ignore` never retries, `clear` retries once, `evict-oldest` once per victim
    const maxAttempt =
      this.onQuotaExceeded === 'evict-oldest'
        ? this.maxQuotaRetry
        : this.onQuotaExceeded === 'clear'
          ? 1
          : 0;
    // computed once, and only if the quota is actually hit
    let victims: string[] | undefined;

    for (let attempt = 0; attempt <= maxAttempt; attempt++) {
      try {
        this.storage.setItem(key, serialized);
        return;
      } catch (error) {
        if (!isQuotaExceededError(error)) {
          console.error('Failed to store cache entry:', key, error);
          return;
        }
        if (attempt === maxAttempt) {
          break;
        }
        if (this.onQuotaExceeded === 'clear') {
          this.clear();
          continue;
        }
        // make room one entry at a time, oldest first: a single response too big for
        // the quota must not cost the whole cache
        victims ??= this.keysByAge(key);
        const victim = victims.shift();
        if (!victim) {
          break;
        }
        this.storage.removeItem(victim);
      }
    }
    console.error('Failed to store cache entry, the storage quota is full:', key);
  }

  /**
   * Keys of the cache, oldest first, excluding `keep`.
   * Only `addedTime` is read out of the stored JSON: rebuilding every request and
   * response here would make an eviction cost as much as reading the whole cache.
   */
  private keysByAge(keep: string): string[] {
    const entries: { key: string; addedTime: number }[] = [];
    for (let i = 0, e = this.storage.length; i < e; i++) {
      const keyWithPrefix = this.storage.key(i);
      if (!keyWithPrefix?.startsWith(this.keyPrefix) || keyWithPrefix === keep) {
        continue;
      }
      let addedTime: number;
      try {
        // an entry we can't read is worth nothing: evict it first
        addedTime = JSON.parse(this.storage.getItem(keyWithPrefix) ?? '{}').addedTime ?? 0;
      } catch {
        addedTime = 0;
      }
      entries.push({ key: keyWithPrefix, addedTime });
    }
    return entries.sort((a, b) => a.addedTime - b.addedTime).map((entry) => entry.key);
  }

  protected serialize(value: NgHttpCachingEntry): NgHttpCachingStorageEntry {
    return {
      url: value.url,
      response: serializeResponse(value.response),
      request: serializeRequest(value.request),
      addedTime: value.addedTime,
      freshTime: value.freshTime,
      invalidated: value.invalidated,
      version: value.version,
    };
  }

  protected deserialize(value: NgHttpCachingStorageEntry): NgHttpCachingEntry {
    return {
      url: value.url,
      response: deserializeResponse(value.response),
      request: deserializeRequest(value.request),
      addedTime: value.addedTime,
      freshTime: value.freshTime,
      invalidated: value.invalidated,
      version: value.version,
    };
  }
}
