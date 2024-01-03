import { NgHttpCachingStorageInterface } from './ng-http-caching-storage.interface';
import { NgHttpCachingEntry } from '../ng-http-caching.service';

export class NgHttpCachingMemoryStorage extends Map<string, NgHttpCachingEntry<any, any>> implements NgHttpCachingStorageInterface { }
