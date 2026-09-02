import { HttpRequest, HttpResponse } from '@angular/common/http';
import { NgHttpCachingBrowserStorage } from './ng-http-caching-browser-storage';
import { NgHttpCachingEntry } from '../ng-http-caching.service';

describe('NgHttpCachingBrowserStorage', () => {
  let store: NgHttpCachingBrowserStorage;
  let mockStorage: Storage;

  beforeEach(() => {
    const storage: any = {};
    mockStorage = {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => (storage[key] = value),
      removeItem: (key: string) => delete storage[key],
      clear: () => Object.keys(storage).forEach((k) => delete storage[k]),
      key: (index: number) => Object.keys(storage)[index] || null,
      get length() {
        return Object.keys(storage).length;
      },
    };
    store = new NgHttpCachingBrowserStorage(mockStorage);
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });

  it('set and get with and without prefix', () => {
    const entry: NgHttpCachingEntry = {
      url: 'http://test.com',
      response: new HttpResponse({ body: 'test' }),
      request: new HttpRequest('GET', 'http://test.com'),
      addedTime: Date.now(),
      version: '1',
    };

    // Set without prefix in key argument (it should add it internally)
    store.set('mykey', entry);
    expect(mockStorage.getItem('NgHttpCaching::mykey')).toBeDefined();

    // Get with prefix
    const res1 = store.get('NgHttpCaching::mykey');
    expect(res1?.url).toBe(entry.url);

    // Get without prefix
    const res2 = store.get('mykey');
    expect(res2?.url).toBe(entry.url);

    // Get non-existent
    expect(store.get('none')).toBeUndefined();
    expect(store.get('')).toBeUndefined();
  });

  it('set with empty key should return early', () => {
    const entry: NgHttpCachingEntry = {
      url: 'http://test.com',
      response: new HttpResponse({ body: 'test' }),
      request: new HttpRequest('GET', 'http://test.com'),
      addedTime: Date.now(),
      version: '1',
    };
    store.set('', entry);
    expect(mockStorage.length).toBe(0);
  });

  it('has with and without prefix', () => {
    mockStorage.setItem('NgHttpCaching::exists', '{}');
    expect(store.has('exists')).toBe(true);
    expect(store.has('NgHttpCaching::exists')).toBe(true);
    expect(store.has('none')).toBe(false);
    expect(store.has('')).toBe(false);
  });

  it('delete with and without prefix', () => {
    mockStorage.setItem('NgHttpCaching::del', '{}');
    expect(store.delete('del')).toBe(true);
    expect(mockStorage.getItem('NgHttpCaching::del')).toBeNull();

    mockStorage.setItem('NgHttpCaching::del2', '{}');
    expect(store.delete('NgHttpCaching::del2')).toBe(true);
    expect(mockStorage.getItem('NgHttpCaching::del2')).toBeNull();

    expect(store.delete('')).toBe(false);
  });

  it('clear should only remove prefixed keys', () => {
    mockStorage.setItem('NgHttpCaching::1', '{}');
    mockStorage.setItem('NgHttpCaching::2', '{}');
    mockStorage.setItem('other', 'val');

    store.clear();

    expect(store.size).toBe(0);
    expect(mockStorage.getItem('other')).toBe('val');
  });

  it('forEach should filter by prefix', () => {
    const entry: NgHttpCachingEntry = {
      url: 'http://test.com',
      response: new HttpResponse({ body: 'test' }),
      request: new HttpRequest('GET', 'http://test.com'),
      addedTime: Date.now(),
      version: '1',
    };
    store.set('k1', entry);
    mockStorage.setItem('other', 'val');

    let count = 0;
    store.forEach((val, key) => {
      count++;
      expect(key).toBe('k1');
      expect(val.url).toBe(entry.url);
    });
    expect(count).toBe(1);
  });

  it('size should only count prefixed keys', () => {
    mockStorage.setItem('NgHttpCaching::1', '{}');
    mockStorage.setItem('other', 'val');
    expect(store.size).toBe(1);
  });

  it('delete of a missing key should return false, like Map', () => {
    expect(store.delete('missing')).toBe(false);
    expect(store.delete('NgHttpCaching::missing')).toBe(false);
  });

  it('forEach should not skip entries when a corrupted one is dropped', () => {
    const entry: NgHttpCachingEntry = {
      url: 'http://test.com',
      response: new HttpResponse({ body: 'test' }),
      request: new HttpRequest('GET', 'http://test.com'),
      addedTime: Date.now(),
      version: '1',
    };
    // the corrupted entry is removed by `get` during the iteration
    mockStorage.setItem('NgHttpCaching::corrupted', 'not-json');
    store.set('k1', entry);
    store.set('k2', entry);

    const keys: string[] = [];
    store.forEach((_val, key) => keys.push(key));
    expect(keys.sort()).toEqual(['k1', 'k2']);
  });

  it('forEach should not skip entries when the callback deletes them', () => {
    const entry: NgHttpCachingEntry = {
      url: 'http://test.com',
      response: new HttpResponse({ body: 'test' }),
      request: new HttpRequest('GET', 'http://test.com'),
      addedTime: Date.now(),
      version: '1',
    };
    store.set('k1', entry);
    store.set('k2', entry);
    store.set('k3', entry);

    const keys: string[] = [];
    store.forEach((_val, key) => {
      keys.push(key);
      store.delete(key);
    });
    expect(keys.sort()).toEqual(['k1', 'k2', 'k3']);
    expect(store.size).toBe(0);
  });
});

describe('NgHttpCachingBrowserStorage: storage quota', () => {
  /**
   * A storage that refuses to hold more than `capacity` entries, the way a browser
   * refuses a write once the quota is full.
   */
  function quotaStorage(capacity: number, error: unknown): Storage {
    const entries: Record<string, string> = {};
    return {
      getItem: (key: string) => entries[key] ?? null,
      setItem: (key: string, value: string) => {
        if (!(key in entries) && Object.keys(entries).length >= capacity) {
          throw error;
        }
        entries[key] = value;
      },
      removeItem: (key: string) => delete entries[key],
      clear: () => Object.keys(entries).forEach((k) => delete entries[k]),
      key: (index: number) => Object.keys(entries)[index] ?? null,
      get length() {
        return Object.keys(entries).length;
      },
    };
  }

  const entryAt = (addedTime: number): NgHttpCachingEntry => ({
    url: 'http://test.com',
    response: new HttpResponse({ body: 'test' }),
    request: new HttpRequest('GET', 'http://test.com'),
    addedTime,
    version: '1',
  });

  const quotaError = (name: string, code?: number) =>
    Object.assign(new Error(name), { name, code });

  // Chrome and Safari, Firefox, and a browser that only sets the legacy numeric code
  const FLAVOURS: [string, unknown][] = [
    ['QuotaExceededError', quotaError('QuotaExceededError', 22)],
    ['NS_ERROR_DOM_QUOTA_REACHED (Firefox)', quotaError('NS_ERROR_DOM_QUOTA_REACHED', 1014)],
    ['the legacy code alone', quotaError('Error', 22)],
  ];

  it.each(FLAVOURS)('should evict the oldest entry and retry, with %s', (_name, error) => {
    const storage = quotaStorage(2, error);
    const store = new NgHttpCachingBrowserStorage(storage);

    store.set('old', entryAt(1000));
    store.set('recent', entryAt(2000));
    expect(store.size).toBe(2);

    // the storage is full: the oldest entry makes room for the new one
    store.set('new', entryAt(3000));

    expect(store.has('new')).toBe(true);
    expect(store.has('recent')).toBe(true);
    expect(store.has('old')).toBe(false);
    expect(store.size).toBe(2);
  });

  it('should evict more than one entry when one is not enough', () => {
    const storage = quotaStorage(3, quotaError('QuotaExceededError', 22));
    const store = new NgHttpCachingBrowserStorage(storage);

    store.set('a', entryAt(1000));
    store.set('b', entryAt(2000));
    store.set('c', entryAt(3000));

    // only two entries fit from now on
    const setItem = storage.setItem.bind(storage);
    storage.setItem = (key: string, value: string) => {
      if (!storage.getItem(key) && store.size >= 2) {
        throw quotaError('QuotaExceededError', 22);
      }
      setItem(key, value);
    };

    store.set('d', entryAt(4000));

    expect(store.has('d')).toBe(true);
    expect(store.has('c')).toBe(true);
    expect(store.has('a')).toBe(false);
    expect(store.has('b')).toBe(false);
  });

  it('should keep the entries of another library untouched', () => {
    const storage = quotaStorage(2, quotaError('QuotaExceededError', 22));
    storage.setItem('someone-else', 'not ours');
    const store = new NgHttpCachingBrowserStorage(storage);

    store.set('old', entryAt(1000));
    store.set('new', entryAt(2000));

    expect(storage.getItem('someone-else')).toBe('not ours');
  });

  it('should clear the whole cache with the "clear" strategy', () => {
    const storage = quotaStorage(2, quotaError('QuotaExceededError', 22));
    const store = new NgHttpCachingBrowserStorage(storage, { onQuotaExceeded: 'clear' });

    store.set('old', entryAt(1000));
    store.set('recent', entryAt(2000));
    store.set('new', entryAt(3000));

    expect(store.has('new')).toBe(true);
    expect(store.size).toBe(1);
  });

  it('should leave the cache alone with the "ignore" strategy', () => {
    const storage = quotaStorage(2, quotaError('QuotaExceededError', 22));
    const store = new NgHttpCachingBrowserStorage(storage, { onQuotaExceeded: 'ignore' });

    store.set('old', entryAt(1000));
    store.set('recent', entryAt(2000));
    store.set('new', entryAt(3000));

    expect(store.has('new')).toBe(false);
    expect(store.has('old')).toBe(true);
    expect(store.has('recent')).toBe(true);
  });

  it('should give up after maxQuotaRetry evictions', () => {
    const storage = quotaStorage(0, quotaError('QuotaExceededError', 22));
    const store = new NgHttpCachingBrowserStorage(storage, { maxQuotaRetry: 1 });

    store.set('new', entryAt(1000));

    expect(store.size).toBe(0);
  });

  it('should not evict anything when the write fails for another reason', () => {
    const storage = quotaStorage(2, new Error('disk on fire'));
    const store = new NgHttpCachingBrowserStorage(storage);

    store.set('old', entryAt(1000));
    store.set('recent', entryAt(2000));
    store.set('new', entryAt(3000));

    expect(store.size).toBe(2);
    expect(store.has('old')).toBe(true);
    expect(store.has('recent')).toBe(true);
  });
});
