import { TestBed } from '@angular/core/testing';
import { provideNgHttpCaching } from './ng-http-caching-provider';
import { NgHttpCachingService, NG_HTTP_CACHING_CONFIG, NgHttpCachingConfig } from './ng-http-caching.service';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { NgHttpCachingInterceptorService } from './ng-http-caching-interceptor.service';
import { NgHttpCachingNgSimpleStateSentinel, NG_HTTP_CACHING_NG_SIMPLE_STATE_CONFIG } from './storage/ng-http-caching-ng-simple-state-sentinel';
import { NgHttpCachingStorageInterface } from './storage/ng-http-caching-storage.interface';
import { Type } from '@angular/core';

describe('provideNgHttpCaching', () => {
    it('should provide default services', () => {
        TestBed.configureTestingModule({
            providers: [provideNgHttpCaching()]
        });
        const service = TestBed.inject(NgHttpCachingService);
        expect(service).toBeTruthy();
        const interceptors = TestBed.inject(HTTP_INTERCEPTORS);
        expect(interceptors.some(i => i instanceof NgHttpCachingInterceptorService)).toBeTrue();
    });

    it('should provide custom config', () => {
        const config = { lifetime: 1234 };
        TestBed.configureTestingModule({
            providers: [provideNgHttpCaching(config)]
        });
        const providedConfig = TestBed.inject(NG_HTTP_CACHING_CONFIG) as NgHttpCachingConfig;
        expect(providedConfig.lifetime).toBe(1234);
    });

    it('should handle sentinel and register adapter class', () => {
        class MockAdapter implements NgHttpCachingStorageInterface {
            size = 0;
            get = () => undefined;
            set = () => { };
            delete = () => true;
            clear = () => { };
            forEach = () => { };
            has = () => false;
        }

        const adapterConfig = { storeName: 'test-store' };
        const sentinel = new NgHttpCachingNgSimpleStateSentinel(
            MockAdapter as any as Type<NgHttpCachingStorageInterface>,
            adapterConfig
        );

        TestBed.configureTestingModule({
            providers: [
                provideNgHttpCaching({ store: sentinel })
            ]
        });

        // Check if MockAdapter class itself is provided and can be injected
        const adapter = TestBed.inject(MockAdapter);
        expect(adapter).toBeInstanceOf(MockAdapter);

        // Check if NG_HTTP_CACHING_NG_SIMPLE_STATE_CONFIG is provided
        const simpleStateConfig = TestBed.inject(NG_HTTP_CACHING_NG_SIMPLE_STATE_CONFIG);
        expect(simpleStateConfig).toEqual(adapterConfig);
    });
});
