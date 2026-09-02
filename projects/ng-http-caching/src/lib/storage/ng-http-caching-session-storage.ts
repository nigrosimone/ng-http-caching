import {
  NgHttpCachingBrowserStorage,
  NgHttpCachingBrowserStorageOptions,
} from './ng-http-caching-browser-storage';
import { getWebStorage } from './ng-http-caching-web-storage';

export class NgHttpCachingSessionStorage extends NgHttpCachingBrowserStorage {
  constructor(options?: NgHttpCachingBrowserStorageOptions) {
    // falls back to an in-memory storage when `sessionStorage` isn't usable,
    // eg. during server side rendering
    super(getWebStorage('sessionStorage'), options);
  }
}

export const withNgHttpCachingSessionStorage = (options?: NgHttpCachingBrowserStorageOptions) =>
  new NgHttpCachingSessionStorage(options);
