import { HttpRequest, HttpResponse } from '@angular/common/http';
import {
  getWebStorage,
  NgHttpCachingInMemoryWebStorage,
  NgHttpCachingWebStorageKind,
} from './ng-http-caching-web-storage';
import { NgHttpCachingLocalStorage } from './ng-http-caching-local-storage';
import { NgHttpCachingSessionStorage } from './ng-http-caching-session-storage';
import { NgHttpCachingEntry } from '../ng-http-caching.service';

/**
 * Replace a global for the duration of the callback, then restore the original
 * descriptor. Used to emulate a non browser environment.
 */
function withGlobal(name: string, value: unknown, callback: () => void): void {
  const original = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  try {
    callback();
  } finally {
    if (original) {
      Object.defineProperty(globalThis, name, original);
    } else {
      delete (globalThis as Record<string, unknown>)[name];
    }
  }
}

const entry = (): NgHttpCachingEntry => ({
  url: 'http://test.com',
  response: new HttpResponse({ body: 'test' }),
  request: new HttpRequest('GET', 'http://test.com'),
  addedTime: Date.now(),
  version: '1',
});

describe('NgHttpCachingInMemoryWebStorage', () => {
  let store: NgHttpCachingInMemoryWebStorage;

  beforeEach(() => {
    store = new NgHttpCachingInMemoryWebStorage();
  });

  it('should behave like a Storage', () => {
    expect(store.length).toBe(0);
    expect(store.getItem('missing')).toBeNull();
    expect(store.key(0)).toBeNull();

    store.setItem('a', '1');
    store.setItem('b', '2');
    expect(store.length).toBe(2);
    expect(store.getItem('a')).toBe('1');
    expect(store.key(1)).toBe('b');

    store.removeItem('a');
    expect(store.getItem('a')).toBeNull();
    expect(store.length).toBe(1);

    store.clear();
    expect(store.length).toBe(0);
  });

  it('should not share state between instances', () => {
    store.setItem('a', '1');
    expect(new NgHttpCachingInMemoryWebStorage().getItem('a')).toBeNull();
  });
});

describe('getWebStorage', () => {
  const kinds: NgHttpCachingWebStorageKind[] = ['localStorage', 'sessionStorage'];

  for (const kind of kinds) {
    it(`should return the real ${kind} when it is usable`, () => {
      expect(getWebStorage(kind)).toBe(globalThis[kind]);
    });

    it(`should not leave the probe key behind in ${kind}`, () => {
      getWebStorage(kind);
      expect(globalThis[kind].getItem('NgHttpCaching::probe')).toBeNull();
    });

    it(`should fall back to memory when ${kind} is undefined (server side rendering)`, () => {
      withGlobal(kind, undefined, () => {
        expect(getWebStorage(kind)).toBeInstanceOf(NgHttpCachingInMemoryWebStorage);
      });
    });

    it(`should fall back to memory when ${kind} throws on read`, () => {
      const original = Object.getOwnPropertyDescriptor(globalThis, kind);
      Object.defineProperty(globalThis, kind, {
        get() {
          throw new Error('SecurityError');
        },
        configurable: true,
      });
      try {
        expect(getWebStorage(kind)).toBeInstanceOf(NgHttpCachingInMemoryWebStorage);
      } finally {
        Object.defineProperty(globalThis, kind, original!);
      }
    });

    it(`should fall back to memory when ${kind} throws on write (private mode)`, () => {
      const throwing = {
        setItem: () => {
          throw new Error('QuotaExceededError');
        },
        removeItem: () => undefined,
      };
      withGlobal(kind, throwing, () => {
        expect(getWebStorage(kind)).toBeInstanceOf(NgHttpCachingInMemoryWebStorage);
      });
    });
  }
});

describe('browser storages outside of a browser', () => {
  it('NgHttpCachingLocalStorage should be usable without localStorage', () => {
    withGlobal('localStorage', undefined, () => {
      const store = new NgHttpCachingLocalStorage();
      const value = entry();
      store.set('k1', value);
      expect(store.size).toBe(1);
      expect(store.get('k1')?.url).toBe(value.url);
      expect(store.delete('k1')).toBe(true);
      expect(store.size).toBe(0);
    });
  });

  it('NgHttpCachingSessionStorage should be usable without sessionStorage', () => {
    withGlobal('sessionStorage', undefined, () => {
      const store = new NgHttpCachingSessionStorage();
      store.set('k1', entry());
      expect(store.size).toBe(1);
    });
  });

  it('two instances should not share the fallback storage', () => {
    withGlobal('localStorage', undefined, () => {
      const storeA = new NgHttpCachingLocalStorage();
      const storeB = new NgHttpCachingLocalStorage();
      storeA.set('k1', entry());
      expect(storeA.size).toBe(1);
      expect(storeB.size).toBe(0);
    });
  });
});
