import { NgHttpCachingBrowserStorage } from './ng-http-caching-browser-storage';

export class NgHttpCachingSessionStorage extends NgHttpCachingBrowserStorage {

    constructor() {
        super(sessionStorage);
    }
}
