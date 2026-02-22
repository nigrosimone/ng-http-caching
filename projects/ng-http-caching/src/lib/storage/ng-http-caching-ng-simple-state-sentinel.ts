import { InjectionToken, type Type } from '@angular/core';
import { NgHttpCachingEntry } from '../ng-http-caching.service';
import { NgHttpCachingStorageInterface } from './ng-http-caching-storage.interface';

/**
 * State shape expected by the adapter.
 */
export interface NgHttpCachingNgSimpleState<K = unknown, T = unknown> {
    entries: Record<string, NgHttpCachingEntry<K, T>>;
}

/**
 * User-facing configuration for the ng-simple-state adapter.
 */
export interface NgHttpCachingNgSimpleStateAdapterConfig {
    storeName?: string;
    [key: string]: any;
}

/**
 * InjectionToken used to pass the user-provided adapter configuration.
 */
export const NG_HTTP_CACHING_NG_SIMPLE_STATE_CONFIG =
    new InjectionToken<NgHttpCachingNgSimpleStateAdapterConfig>('ng-http-caching-ng-simple-state.config');

/**
 * Lightweight sentinel / marker class.
 */
export class NgHttpCachingNgSimpleStateSentinel {
    constructor(
        public readonly adapterClass: Type<NgHttpCachingStorageInterface>,
        public readonly adapterConfig?: NgHttpCachingNgSimpleStateAdapterConfig
    ) { }
}
