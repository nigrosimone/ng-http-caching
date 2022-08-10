/* eslint-disable no-unused-vars */
import { NgHttpCachingEntry } from '../ng-http-caching.service';

export interface NgHttpCachingStorageInterface {

    readonly size: number;

    clear(): void;

    delete(key: string): boolean;

    forEach<K = any, T = any>(callbackfn: (value: NgHttpCachingEntry<K, T>, key: string) => void): void;

    get<K = any, T = any>(key: string): NgHttpCachingEntry<K, T> | undefined;

    has(key: string): boolean;

    set<K = any, T = any>(key: string, value: NgHttpCachingEntry<K, T>): void;
}
