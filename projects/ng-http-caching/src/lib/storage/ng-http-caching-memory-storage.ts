import { NgHttpCachingStorageInterface } from './ng-http-caching-storage.interface';
import { NgHttpCachingEntry } from '../ng-http-caching.service';

export class NgHttpCachingMemoryStorage implements NgHttpCachingStorageInterface {

    get size(): number {
        return this.store.size;
    }

    private store = new Map<string, NgHttpCachingEntry<any, any>>();

    clear(): void {
        this.store.clear();
    }

    delete(key: string): boolean {
        return this.store.delete(key);
    }


    forEach<K, T>(callbackfn: (value: NgHttpCachingEntry<K, T>, key: string) => void): void {
        return this.store.forEach(callbackfn);
    }

    get<K, T>(key: string): NgHttpCachingEntry<K, T> | undefined {
        return this.store.get(key);
    }

    has(key: string): boolean {
        return this.store.has(key);
    }

    set<K, T>(key: string, value: NgHttpCachingEntry<K, T>): void {
        this.store.set(key, value);
    }
}
