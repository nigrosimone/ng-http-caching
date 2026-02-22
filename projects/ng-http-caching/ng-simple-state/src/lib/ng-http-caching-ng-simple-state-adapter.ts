import { Injectable, inject } from '@angular/core';
import {
    NgHttpCachingEntry,
    NgHttpCachingStorageInterface,
    NgHttpCachingNgSimpleStateSentinel,
    NG_HTTP_CACHING_NG_SIMPLE_STATE_CONFIG,
    type NgHttpCachingNgSimpleState,
    type NgHttpCachingNgSimpleStateAdapterConfig
} from 'ng-http-caching';
import { NgSimpleStateBaseSignalStore, type NgSimpleStateStoreConfig } from 'ng-simple-state';

/**
 * Storage adapter for ng-http-caching backed by ng-simple-state.
 *
 * This allows a single source of truth for HTTP cache entries.
 */
@Injectable({
    providedIn: 'root'
})
export class NgHttpCachingNgSimpleStateAdapter extends NgSimpleStateBaseSignalStore<NgHttpCachingNgSimpleState>
    implements NgHttpCachingStorageInterface {

    protected override storeConfig(): NgSimpleStateStoreConfig {
        const userConfig = inject(NG_HTTP_CACHING_NG_SIMPLE_STATE_CONFIG, { optional: true });
        return {
            storeName: userConfig?.storeName ?? 'NgHttpCaching',
            ...userConfig,
        };
    }

    protected override initialState(): NgHttpCachingNgSimpleState<unknown, unknown> {
        return { entries: {} };
    }

    get size(): number {
        return Object.keys(this.getCurrentState().entries).length;
    }

    clear(): void {
        const current = this.getCurrentState();
        const next = {
            ...current,
            entries: {}
        };
        this.replaceState(next, `ngHttpCaching:clear`);
    }

    delete(key: string): boolean {
        if (!key) {
            return false;
        }
        const current = this.getCurrentState();
        if (!Object.prototype.hasOwnProperty.call(current.entries, key)) {
            return false;
        }
        const nextEntries = { ...current.entries };
        delete nextEntries[key];
        const next = {
            ...current,
            entries: nextEntries
        };
        this.replaceState(next, `ngHttpCaching:delete`);
        return true;
    }

    forEach<K = unknown, T = unknown>(callbackfn: (value: NgHttpCachingEntry<K, T>, key: string) => void): void {
        const entries = this.getCurrentState().entries;
        Object.keys(entries).forEach((key) => {
            callbackfn(entries[key] as NgHttpCachingEntry<K, T>, key);
        });
    }

    get<K = unknown, T = unknown>(key: string): Readonly<NgHttpCachingEntry<K, T>> | undefined {
        if (!key) {
            return undefined;
        }
        return this.getCurrentState().entries[key] as Readonly<NgHttpCachingEntry<K, T>> | undefined;
    }

    has(key: string): boolean {
        if (!key) {
            return false;
        }
        return Object.prototype.hasOwnProperty.call(this.getCurrentState().entries, key);
    }

    set<K = unknown, T = unknown>(key: string, value: NgHttpCachingEntry<K, T>): void {
        if (!key) {
            return;
        }
        const current = this.getCurrentState();
        const next = {
            ...current,
            entries: {
                ...current.entries,
                [key]: value
            }
        };
        this.replaceState(next, `ngHttpCaching:set`);
    }
}

/**
 * Factory helper to enable the ng-simple-state adapter for ng-http-caching.
 */
export function withNgHttpCachingNgSimpleState(config?: NgHttpCachingNgSimpleStateAdapterConfig): NgHttpCachingNgSimpleStateSentinel {
    return new NgHttpCachingNgSimpleStateSentinel(NgHttpCachingNgSimpleStateAdapter as any, config);
}
