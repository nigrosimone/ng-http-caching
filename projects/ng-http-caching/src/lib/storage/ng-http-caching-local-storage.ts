import { NgHttpCachingBrowserStorage } from './ng-http-caching-browser-storage';
import { getWebStorage } from './ng-http-caching-web-storage';

export class NgHttpCachingLocalStorage extends NgHttpCachingBrowserStorage {
  constructor() {
    // falls back to an in-memory storage when `localStorage` isn't usable,
    // eg. during server side rendering
    super(getWebStorage('localStorage'));
  }
}

export const withNgHttpCachingLocalStorage = () => new NgHttpCachingLocalStorage();
