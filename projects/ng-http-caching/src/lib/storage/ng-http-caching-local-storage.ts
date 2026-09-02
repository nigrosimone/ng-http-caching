import {
  NgHttpCachingBrowserStorage,
  NgHttpCachingBrowserStorageOptions,
} from './ng-http-caching-browser-storage';
import { getWebStorage } from './ng-http-caching-web-storage';

export class NgHttpCachingLocalStorage extends NgHttpCachingBrowserStorage {
  constructor(options?: NgHttpCachingBrowserStorageOptions) {
    // falls back to an in-memory storage when `localStorage` isn't usable,
    // eg. during server side rendering
    super(getWebStorage('localStorage'), options);
  }
}

export const withNgHttpCachingLocalStorage = (options?: NgHttpCachingBrowserStorageOptions) =>
  new NgHttpCachingLocalStorage(options);
