import { NgHttpCachingNgSimpleStateSentinel } from './ng-http-caching-ng-simple-state-sentinel';

describe('NgHttpCachingNgSimpleStateSentinel', () => {
    it('should create an instance with adapter class', () => {
        const mockClass: any = class { };
        const sentinel = new NgHttpCachingNgSimpleStateSentinel(mockClass);
        expect(sentinel.adapterClass).toBe(mockClass);
        expect(sentinel.adapterConfig).toBeUndefined();
    });

    it('should create an instance with adapter class and config', () => {
        const mockClass: any = class { };
        const config = { storeName: 'test' };
        const sentinel = new NgHttpCachingNgSimpleStateSentinel(mockClass, config);
        expect(sentinel.adapterClass).toBe(mockClass);
        expect(sentinel.adapterConfig).toBe(config);
    });
});
