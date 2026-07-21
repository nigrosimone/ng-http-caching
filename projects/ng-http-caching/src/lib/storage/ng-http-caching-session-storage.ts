import { NgHttpCachingBrowserStorage } from './ng-http-caching-browser-storage';
import { getWebStorage } from './ng-http-caching-web-storage';

export class NgHttpCachingSessionStorage extends NgHttpCachingBrowserStorage {
  constructor() {
    // falls back to an in-memory storage when `sessionStorage` isn't usable,
    // eg. during server side rendering
    super(getWebStorage('sessionStorage'));
  }
}

export const withNgHttpCachingSessionStorage = () => new NgHttpCachingSessionStorage();
