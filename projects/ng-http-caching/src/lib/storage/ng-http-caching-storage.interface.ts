/* eslint-disable no-unused-vars */
import { NgHttpCachingEntry } from '../ng-http-caching.service';

export interface NgHttpCachingStorageInterface {

    readonly size: number;

    clear(): void;

    delete(key: string): boolean;

    forEach(callbackfn: (value: NgHttpCachingEntry, key: string) => void): void;

    get(key: string): NgHttpCachingEntry | undefined;

    has(key: string): boolean;

    set(key: string, value: NgHttpCachingEntry): void;
}
