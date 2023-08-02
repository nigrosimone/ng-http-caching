import { HttpContext, HttpHeaders, HttpParams, HttpRequest, HttpResponse } from '@angular/common/http';
import { NgHttpCachingSessionStorage } from './ng-http-caching-session-storage';
import { NgHttpCachingStorageInterface } from './ng-http-caching-storage.interface';
import { KEY_PREFIX } from './ng-http-caching-browser-storage';


describe('NgHttpCachingSessionStorage', () => {
    let store: NgHttpCachingStorageInterface;

    beforeEach(() => {
        store = new NgHttpCachingSessionStorage();
        localStorage.setItem('NgHttpCachingSessionStorageTEST', 'TEST');
    });

    afterEach(() => {
        store.clear();
        expect(store.size).toBe(0);

        expect(localStorage.getItem('NgHttpCachingSessionStorageTEST')).toBe('TEST');
        localStorage.removeItem('NgHttpCachingSessionStorageTEST');
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
                params: new HttpParams(),
                headers: new HttpHeaders({
                    'content-type': 'application/json'
                }),
            }),
            response: new HttpResponse({
                headers: new HttpHeaders({
                    'content-type': 'application/json'
                }), status: 200, body: { OK: true }
            }),
            version: '1'
        };
        store.set(entry.url, entry);

        expect(store.has(entry.url)).toBeTrue();
        const cache = store.get(entry.url);
        expect(cache).toBeTruthy();
        expect(store.size).toBe(1);
        expect(cache?.addedTime).toEqual(entry.addedTime);
        expect(cache?.url).toEqual(entry.url);
        expect(cache?.response).toBeTruthy();
        expect(cache?.response.body).toEqual(entry.response.body);
        store.forEach((value, key) => {
            expect(key).toBe('NgHttpCaching::' + entry.url);
        });
        store.delete(KEY_PREFIX + entry.url);
        expect(store.get(entry.url)).toBeUndefined();
        expect(store.size).toBe(0);

        store.set(entry.url, entry);
        expect(store.size).toBe(1);
        store.clear();
        expect(store.size).toBe(0);
    });
});
