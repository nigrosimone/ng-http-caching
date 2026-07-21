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
