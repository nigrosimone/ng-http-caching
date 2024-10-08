import { NgHttpCachingBrowserStorage } from './ng-http-caching-browser-storage';

export class NgHttpCachingLocalStorage extends NgHttpCachingBrowserStorage {

    constructor() {
        super(localStorage);
    }
}

export const withNgHttpCachingLocalStorage = () => new NgHttpCachingLocalStorage();