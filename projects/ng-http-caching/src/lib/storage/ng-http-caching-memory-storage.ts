import { NgHttpCachingStorageInterface } from './ng-http-caching-storage.interface';
import { NgHttpCachingEntry } from '../ng-http-caching.service';

export class NgHttpCachingMemoryStorage implements NgHttpCachingStorageInterface {

    get size(): number {
        return this.store.size;
    }

    private store = new Map<string, NgHttpCachingEntry>();

    clear(): void {
        this.store.clear();
    }

    delete(key: string): boolean {
        return this.store.delete(key);
    }

    // eslint-disable-next-line no-unused-vars
    forEach(callbackfn: (value: NgHttpCachingEntry, key: string) => void): void {
        return this.store.forEach(callbackfn);
    }

    get(key: string): NgHttpCachingEntry | undefined {
        return this.store.get(key);
    }

    has(key: string): boolean {
        return this.store.has(key);
    }

    set(key: string, value: NgHttpCachingEntry): void {
        this.store.set(key, value);
    }
}
