import { Injectable, InjectionToken, inject } from '@angular/core';
import { NgHttpCachingEntry } from '../ng-http-caching.service';
import { NgHttpCachingStorageInterface } from './ng-http-caching-storage.interface';
import { NgSimpleStateBaseSignalStore, NgSimpleStateStoreConfig } from 'ng-simple-state';

/**
 * State shape expected by the adapter.
 */
export interface NgHttpCachingNgSimpleState<K = unknown, T = unknown> {
    entries: Record<string, NgHttpCachingEntry<K, T>>;
}

/**
 * User-facing configuration for the ng-simple-state adapter.
 *
 * Accepts all {@link NgSimpleStateStoreConfig} options.
 */
export type NgHttpCachingNgSimpleStateAdapterConfig = Partial<NgSimpleStateStoreConfig>;

/**
 * InjectionToken used to pass the user-provided adapter configuration
 * to {@link NgHttpCachingNgSimpleStateAdapter}.
 *
 * Automatically registered by `provideNgHttpCaching()` / `NgHttpCachingModule.forRoot()`
 * when the sentinel returned by {@link withNgHttpCachingNgSimpleState} carries a config.
 */
export const NG_HTTP_CACHING_NG_SIMPLE_STATE_CONFIG =
    new InjectionToken<NgHttpCachingNgSimpleStateAdapterConfig>('ng-http-caching-ng-simple-state.config');

/**
 * Lightweight sentinel / marker class returned by {@link withNgHttpCachingNgSimpleState}.
 *
 * It implements {@link NgHttpCachingStorageInterface} with throwing methods so it
 * can be assigned to `NgHttpCachingConfig.store` **outside** an Angular
 * injection context (i.e. plain object literal).  The real
 * {@link NgHttpCachingNgSimpleStateAdapter} will be injected at runtime when
 * the caching service detects this sentinel via `instanceof`.
 */
export class NgHttpCachingNgSimpleStateSentinel implements NgHttpCachingStorageInterface {
    /**
     * Optional adapter configuration provided by the user.
     */
    readonly adapterConfig?: NgHttpCachingNgSimpleStateAdapterConfig;

    constructor(config?: NgHttpCachingNgSimpleStateAdapterConfig) {
        this.adapterConfig = config;
    }

    private fail(): never {
        throw new Error(
            'NgHttpCachingNgSimpleStateSentinel is a placeholder and must not be used as an actual store. ' +
            'Make sure the NgHttpCachingNgSimpleStateAdapter is properly injected via Angular DI.'
        );
    }
    get size(): number { return this.fail(); }
    clear(): void { this.fail(); }
    delete(_key: string): boolean { return this.fail(); }
    forEach<K, T>(_callbackfn: (value: NgHttpCachingEntry<K, T>, key: string) => void): void { this.fail(); }
    get<K, T>(_key: string): Readonly<NgHttpCachingEntry<K, T>> | undefined { return this.fail(); }
    has(_key: string): boolean { return this.fail(); }
    set<K, T>(_key: string, _value: NgHttpCachingEntry<K, T>): void { this.fail(); }
}

/**
 * Factory helper to enable the ng-simple-state adapter for ng-http-caching.
 *
 * Usage:
 * ```ts
 * provideNgHttpCaching({
 *     store: withNgHttpCachingNgSimpleState(),
 * })
 *
 * // with custom ng-simple-state config
 * provideNgHttpCaching({
 *     store: withNgHttpCachingNgSimpleState({
 *         enableDevTool: true,
 *         persistentStorage: 'session',
 *         storeName: 'MyHttpCache',
 *     }),
 * })
 * ```
 *
 * The returned object is a lightweight sentinel; the actual
 * {@link NgHttpCachingNgSimpleStateAdapter} is created via Angular DI
 * when the caching service initialises.
 */
export const withNgHttpCachingNgSimpleState = (config?: NgHttpCachingNgSimpleStateAdapterConfig): NgHttpCachingStorageInterface =>
    new NgHttpCachingNgSimpleStateSentinel(config);

/**
 * Storage adapter for ng-http-caching backed by ng-simple-state.
 *
 * This allows a single source of truth for HTTP cache entries.
 */
@Injectable({ providedIn: 'root' })
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
