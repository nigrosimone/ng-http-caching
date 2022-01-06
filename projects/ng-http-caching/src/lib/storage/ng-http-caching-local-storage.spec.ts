import { HttpContext, HttpHeaders, HttpRequest, HttpResponse } from '@angular/common/http';
import { NgHttpCachingLocalStorage } from './ng-http-caching-local-storage';
import { NgHttpCachingStorageInterface } from './ng-http-caching-storage.interface';

describe('NgHttpCachingLocalStorage', () => {
    let store: NgHttpCachingStorageInterface;

    beforeEach(() => {
        store = new NgHttpCachingLocalStorage();
        localStorage.setItem('NgHttpCachingLocalStorageTEST', 'TEST');
    });

    afterEach(() => {
        store.clear();
        expect(store.size).toBe(0);

        expect(localStorage.getItem('NgHttpCachingLocalStorageTEST')).toBe('TEST');
        localStorage.removeItem('NgHttpCachingLocalStorageTEST');
    });

    it('should be created', () => {
        expect(store).toBeTruthy();
    });

    it('set -> get -> clear', () => {
        const entry = {
            addedTime: new Date().getTime(),
            url: 'http://example.com',
            request: new HttpRequest('GET', 'http://example.com', {
                context: new HttpContext(),
                headers: new HttpHeaders({
                    'content-type': 'application/json'
                }),
            }),
            response: new HttpResponse({headers: new HttpHeaders({
                'content-type': 'application/json'
            }), status: 200, body: { OK: true } }),
        };
        store.set(entry.url, entry);

        expect(store.has(entry.url)).toBeTrue();
        const cache = store.get(entry.url);
        expect(cache).toBeTruthy();
        expect(store.size).toBe(1);
        expect(cache?.addedTime).toEqual(entry.addedTime);
        expect(cache?.url).toEqual(entry.url);
        expect(cache?.response).toBeTruthy();
        expect(cache?.response.body.body).toEqual(entry.response.body);
        store.delete(entry.url);
        expect(store.get(entry.url)).toBeUndefined();
        expect(store.size).toBe(0);
    });
});
