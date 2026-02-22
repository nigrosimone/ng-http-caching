import { HttpContext, HttpHeaders, HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
    NgHttpCachingEntry,
    NgHttpCachingStorageInterface,
    NgHttpCachingNgSimpleStateSentinel,
    NG_HTTP_CACHING_NG_SIMPLE_STATE_CONFIG
} from 'ng-http-caching';
import {
    NgHttpCachingNgSimpleStateAdapter,
    withNgHttpCachingNgSimpleState,
} from './ng-http-caching-ng-simple-state-adapter';


describe('NgHttpCachingNgSimpleStateAdapter', () => {

    let store: NgHttpCachingStorageInterface;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [NgHttpCachingNgSimpleStateAdapter],
        });
        store = TestBed.inject(NgHttpCachingNgSimpleStateAdapter);
    });

    afterEach(() => {
        store.clear();
        expect(store.size).toBe(0);
    });

    it('should be created', () => {
        expect(store).toBeTruthy();
    });

    it('set -> get -> delete -> clear', () => {
        const entry: NgHttpCachingEntry = {
            addedTime: Date.now(),
            url: 'http://example.com',
            request: new HttpRequest('GET', 'http://example.com', {
                context: new HttpContext(),
                headers: new HttpHeaders(),
            }),
            response: new HttpResponse({ headers: new HttpHeaders(), status: 200, body: { OK: true } }),
            version: '1'
        };

        store.set('GET@http://example.com', entry);

        expect(store.has('GET@http://example.com')).toBeTrue();
        expect(store.size).toBe(1);

        const cache = store.get('GET@http://example.com');
        expect(cache).toBeTruthy();
        expect(cache?.response.body).toEqual({ OK: true });

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        let count = 0;
        store.forEach((value, key) => {
            count++;
            expect(key).toBe('GET@http://example.com');
            expect(value.url).toBe('http://example.com');
        });
        expect(count).toBe(1);

        expect(store.delete('GET@http://example.com')).toBeTrue();
        expect(store.has('GET@http://example.com')).toBeFalse();
        expect(store.size).toBe(0);

        expect(store.delete('missing')).toBeFalse();

        store.set('GET@http://example.com', entry);
        expect(store.size).toBe(1);
        store.clear();
        expect(store.size).toBe(0);
    });
});

describe('NgHttpCachingNgSimpleStateSentinel', () => {
    it('should be creatable', () => {
        const sentinel = new NgHttpCachingNgSimpleStateSentinel(NgHttpCachingNgSimpleStateAdapter);
        expect(sentinel).toBeTruthy();
        expect(sentinel.adapterClass).toBe(NgHttpCachingNgSimpleStateAdapter);
        expect(sentinel.adapterConfig).toBeUndefined();
    });

    it('should store adapter config', () => {
        const config = { storeName: 'Custom', enableDevTool: false };
        const sentinel = new NgHttpCachingNgSimpleStateSentinel(NgHttpCachingNgSimpleStateAdapter, config);
        expect(sentinel.adapterConfig).toEqual(config);
    });
});

describe('withNgHttpCachingNgSimpleState', () => {
    it('should return a sentinel instance', () => {
        const result = withNgHttpCachingNgSimpleState();
        expect(result).toBeInstanceOf(NgHttpCachingNgSimpleStateSentinel);
        expect(result.adapterClass).toBe(NgHttpCachingNgSimpleStateAdapter);
        expect(result.adapterConfig).toBeUndefined();
    });

    it('should return a sentinel with config', () => {
        const config = { storeName: 'MyCache', enableDevTool: true };
        const result = withNgHttpCachingNgSimpleState(config);
        expect(result).toBeInstanceOf(NgHttpCachingNgSimpleStateSentinel);
        expect(result.adapterClass).toBe(NgHttpCachingNgSimpleStateAdapter);
        expect(result.adapterConfig).toEqual(config);
    });
});

describe('NgHttpCachingNgSimpleStateAdapter with custom config', () => {
    let store: NgHttpCachingNgSimpleStateAdapter;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                NgHttpCachingNgSimpleStateAdapter,
                {
                    provide: NG_HTTP_CACHING_NG_SIMPLE_STATE_CONFIG,
                    useValue: { storeName: 'CustomCache', enableDevTool: false },
                },
            ],
        });
        store = TestBed.inject(NgHttpCachingNgSimpleStateAdapter);
    });

    afterEach(() => {
        store.clear();
    });

    it('should use custom storeName from config', () => {
        expect(store).toBeTruthy();
        // The store should work normally with custom config
        store.set('key1', {
            addedTime: Date.now(),
            url: 'http://test.com',
            request: new HttpRequest('GET', 'http://test.com'),
            response: new HttpResponse({ status: 200, body: {} }),
            version: '1',
        });
        expect(store.size).toBe(1);
        expect(store.has('key1')).toBeTrue();
    });
});
