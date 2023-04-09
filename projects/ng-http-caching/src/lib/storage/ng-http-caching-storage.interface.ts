import { NgHttpCachingEntry } from '../ng-http-caching.service';

export interface NgHttpCachingStorageInterface {

    /**
     * The number of cached entries.
     */
    readonly size: number;

    /**
     * Clear the cache.
     */
    clear(): void;

    /**
     * Delete the chache entry for the provided key.
     */
    delete(key: string): boolean;

    /**
     * The forEach() method executes a provided function once for each chache entry.
     */
    forEach<K = any, T = any>(callbackfn: (value: NgHttpCachingEntry<K, T>, key: string) => void): void;

    /**
     * Return the chache entry for the provided key.
     */
    get<K = any, T = any>(key: string): Readonly<NgHttpCachingEntry<K, T>> | undefined;

    /**
     * Return true if the cache entry exists the provided key.
     */
    has(key: string): boolean;

    /**
     * Set the chache entry for the provided key.
     */
    set<K = any, T = any>(key: string, value: NgHttpCachingEntry<K, T>): void;
}
