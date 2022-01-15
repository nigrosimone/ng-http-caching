import { HttpContext, HttpHeaders, HttpRequest, HttpResponse } from '@angular/common/http';
import { NgHttpCachingMemoryStorage } from './ng-http-caching-memory-storage';
import { NgHttpCachingStorageInterface } from './ng-http-caching-storage.interface';

describe('NgHttpCachingMemoryStorage', () => {
    let store: NgHttpCachingStorageInterface;

    beforeEach(() => {
        store = new NgHttpCachingMemoryStorage();
    });

    afterEach(() => {
        store.clear();
        expect(store.size).toBe(0);
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
                headers: new HttpHeaders(),
            }),
            response: new HttpResponse({headers: new HttpHeaders(), status: 200, body: { OK: true } }),
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
        store.delete(entry.url);
        expect(store.get(entry.url)).toBeUndefined();
        expect(store.size).toBe(0);
    });
});
