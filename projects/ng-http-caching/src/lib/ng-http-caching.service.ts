import { Injectable, InjectionToken, Inject, Optional, VERSION, isDevMode } from '@angular/core';
import { HttpRequest, HttpResponse, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs/internal/Observable';
import { NgHttpCachingStorageInterface } from './storage/ng-http-caching-storage.interface';
import { NgHttpCachingMemoryStorage } from './storage/ng-http-caching-memory-storage';

export interface NgHttpCachingEntry<K = any, T = any> {
  url: string;
  response: HttpResponse<T>;
  request: HttpRequest<K>;
  addedTime: number;
  version: string;
}

export const NG_HTTP_CACHING_CONFIG = new InjectionToken<NgHttpCachingConfig>(
  'ng-http-caching.config'
);

export enum NgHttpCachingStrategy {
  ALLOW_ALL = 'ALLOW_ALL',
  DISALLOW_ALL = 'DISALLOW_ALL'
}

export enum NgHttpCachingHeaders {
  ALLOW_CACHE = 'X-NG-HTTP-CACHING-ALLOW-CACHE',
  DISALLOW_CACHE = 'X-NG-HTTP-CACHING-DISALLOW-CACHE',
  LIFETIME = 'X-NG-HTTP-CACHING-LIFETIME',
  TAG = 'X-NG-HTTP-CACHING-TAG'
}

export const NgHttpCachingHeadersList = Object.values(NgHttpCachingHeaders);

export const NG_HTTP_CACHING_SECOND_IN_MS = 1000;
export const NG_HTTP_CACHING_MINUTE_IN_MS = NG_HTTP_CACHING_SECOND_IN_MS * 60;
export const NG_HTTP_CACHING_HOUR_IN_MS = NG_HTTP_CACHING_MINUTE_IN_MS * 60;
export const NG_HTTP_CACHING_DAY_IN_MS = NG_HTTP_CACHING_HOUR_IN_MS * 24;
export const NG_HTTP_CACHING_WEEK_IN_MS = NG_HTTP_CACHING_DAY_IN_MS * 7;
export const NG_HTTP_CACHING_MONTH_IN_MS = NG_HTTP_CACHING_DAY_IN_MS * 30;
export const NG_HTTP_CACHING_YEAR_IN_MS = NG_HTTP_CACHING_DAY_IN_MS * 365;

export interface NgHttpCachingConfig {
  store?: NgHttpCachingStorageInterface;
  lifetime?: number;
  allowedMethod?: string[];
  cacheStrategy?: NgHttpCachingStrategy;
  version?: string;
  isExpired?: <K, T>(entry: NgHttpCachingEntry<K, T>) => boolean | undefined;
  isCacheable?: <K>(req: HttpRequest<K>) => boolean | undefined;
  getKey?: <K>(req: HttpRequest<K>) => string | undefined;
  isValid?: <K, T>(entry: NgHttpCachingEntry<K, T>) => boolean | undefined;
}

export interface NgHttpCachingDefaultConfig extends NgHttpCachingConfig {
  store: NgHttpCachingStorageInterface;
  lifetime: number;
  allowedMethod: string[];
  cacheStrategy: NgHttpCachingStrategy;
  version: string;
}

export const NgHttpCachingConfigDefault: NgHttpCachingDefaultConfig = {
  store: new NgHttpCachingMemoryStorage(),
  lifetime: NG_HTTP_CACHING_HOUR_IN_MS,
  version: VERSION.major,
  allowedMethod: ['GET', 'HEAD'],
  cacheStrategy: NgHttpCachingStrategy.ALLOW_ALL,
};

@Injectable()
export class NgHttpCachingService {

  private queue = new Map<string, Observable<HttpEvent<any>>>();

  private config: NgHttpCachingDefaultConfig;

  private gcLock = false;

  private devMode: boolean = isDevMode();

  constructor(
    @Inject(NG_HTTP_CACHING_CONFIG) @Optional() config: NgHttpCachingConfig
  ) {
    if (config) {
      this.config = { ...NgHttpCachingConfigDefault, ...config };
    } else {
      this.config = { ...NgHttpCachingConfigDefault };
    }
    // start cache clean
    this.runGc();
  }

  /**
   * Return the config
   */
  getConfig(): Readonly<NgHttpCachingConfig> {
    return this.config;
  }

  /**
   * Return the queue map
   */
  getQueue(): Readonly<Map<string, Observable<HttpEvent<any>>>> {
    return this.queue;
  }

  /**
   * Return the cache store
   */
  getStore(): Readonly<NgHttpCachingStorageInterface> {
    return this.config.store;
  }

  /**
   * Return response from cache
   */
  getFromCache<K, T>(req: HttpRequest<K>): Readonly<HttpResponse<T>> | undefined {
    const key: string = this.getKey(req);
    const cached: NgHttpCachingEntry<K, T> | undefined = this.config.store.get<K, T>(key);

    if (!cached) {
      return undefined;
    }

    if (this.isExpired(cached)) {
      this.clearCacheByKey(key);
      return undefined;
    }

    return this.deepFreeze(cached.response);
  }

  /**
   * Add response to cache
   */
  addToCache<K, T>(req: HttpRequest<K>, res: HttpResponse<T>): boolean {
    const key: string = this.getKey(req);
    const entry: NgHttpCachingEntry<K, T> = {
      url: req.urlWithParams,
      response: res,
      request: req,
      addedTime: Date.now(),
      version: this.config.version,
    };
    if (this.isValid(entry)) {
      this.config.store.set(key, entry);
      return true;
    }
    return false;
  }

  /**
   * Delete response from cache
   */
  deleteFromCache<K>(req: HttpRequest<K>): boolean {
    const key: string = this.getKey(req);
    return this.clearCacheByKey(key);
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.config.store.clear();
  }

  /**
   * Clear the cache by key
   */
  clearCacheByKey(key: string): boolean {
    return this.config.store.delete(key);
  }

  /**
   * Clear the cache by regex
   */
  clearCacheByRegex<K, T>(regex: RegExp): void {
    this.config.store.forEach<K, T>((entry: NgHttpCachingEntry<K, T>, key: string) => {
      if (regex.test(key)) {
        this.clearCacheByKey(key);
      }
    });
  }

  /**
   * Clear the cache by TAG
   */
  clearCacheByTag<K, T>(tag: string): void {
    this.config.store.forEach<K, T>((entry: NgHttpCachingEntry<K, T>, key: string) => {
      const tagHeader = entry.request.headers.get(NgHttpCachingHeaders.TAG);
      if (tagHeader && tagHeader.split(',').includes(tag)) {
        this.clearCacheByKey(key);
      }
    });
  }

  /**
   * Run garbage collector (delete expired cache entry)
   */
  runGc<K, T>(): boolean {
    if (this.gcLock) {
      return false;
    }
    this.gcLock = true;
    this.config.store.forEach<K, T>((entry: NgHttpCachingEntry<K, T>, key: string) => {
      if (this.isExpired(entry)) {
        this.clearCacheByKey(key);
      }
    });
    this.gcLock = false;
    return true;
  }

  /**
   * Return true if cache entry is expired
   */
  isExpired<K, T>(entry: NgHttpCachingEntry<K, T>): boolean {
    // if user provide custom method, use it
    if (typeof this.config.isExpired === 'function') {
      const result = this.config.isExpired(entry);
      // if result is undefined, normal behaviour is provided
      if (result !== undefined) {
        return result;
      }
    }
    // config/default lifetime
    let lifetime: number = this.config.lifetime;
    // request has own lifetime
    const headerLifetime = entry.request.headers.get(NgHttpCachingHeaders.LIFETIME);
    if (headerLifetime) {
      lifetime = +headerLifetime;
    }
    // never expire if 0
    if (lifetime === 0) {
      return false;
    }
    // wrong lifetime
    if (lifetime < 0 || isNaN(lifetime)) {
      throw new Error('lifetime must be greater than or equal 0');
    }
    return entry.addedTime + lifetime < Date.now();
  }

  /**
   * Return true if cache entry is valid for store in the cache
   */
  isValid<K, T>(entry: NgHttpCachingEntry<K, T>): boolean {
    // if user provide custom method, use it
    if (typeof this.config.isValid === 'function') {
      const result = this.config.isValid(entry);
      // if result is undefined, normal behaviour is provided
      if (result !== undefined) {
        return result;
      }
    }
    // different version
    if (this.config.version !== entry.version) {
      return false;
    }
    return true;
  }

  /**
   * Return true if the request is cacheable
   */
  isCacheable<K>(req: HttpRequest<K>): boolean {
    // if user provide custom method, use it
    if (typeof this.config.isCacheable === 'function') {
      const result = this.config.isCacheable(req);
      // if result is undefined, normal behaviour is provided
      if (result !== undefined) {
        return result;
      }
    }
    // request has disallow cache header
    if (req.headers.has(NgHttpCachingHeaders.DISALLOW_CACHE)) {
      return false;
    }
    // strategy is disallow all...
    if (this.config.cacheStrategy === NgHttpCachingStrategy.DISALLOW_ALL) {
      // request isn't allowed if come without allow header
      if (!req.headers.has(NgHttpCachingHeaders.ALLOW_CACHE)) {
        return false;
      }
    }
    // if allowed method is only ALL, allow all http methos
    if (this.config.allowedMethod.length === 1) {
      if (this.config.allowedMethod[0] === 'ALL') {
        return true;
      }
    }
    // request is allowed if method is in allowedMethod
    return this.config.allowedMethod.indexOf(req.method) !== -1;
  }

  /**
   * Return the cache key
   */
  getKey<K>(req: HttpRequest<K>): string {
    // if user provide custom method, use it
    if (typeof this.config.getKey === 'function') {
      const result = this.config.getKey(req);
      // if result is undefined, normal behaviour is provided
      if (result !== undefined) {
        return result;
      }
    }
    // default key id is req.method plus url with query parameters
    return req.method + '@' + req.urlWithParams;
  }

  /**
   * Return observable from cache
   */
  getFromQueue<K, T>(req: HttpRequest<K>): Observable<HttpEvent<T>> | undefined {
    const key: string = this.getKey(req);
    const cached: Observable<HttpEvent<T>> | undefined = this.queue.get(key);

    if (!cached) {
      return undefined;
    }

    return cached;
  }

  /**
   * Add observable to cache
   */
  addToQueue<K, T>(req: HttpRequest<K>, obs: Observable<HttpEvent<T>>): void {
    const key: string = this.getKey(req);
    this.queue.set(key, obs);
  }

  /**
   * Delete observable from cache
   */
  deleteFromQueue<K>(req: HttpRequest<K>): boolean {
    const key: string = this.getKey(req);
    return this.queue.delete(key);
  }

  /**
   * Recursively Object.freeze simple Javascript structures consisting of plain objects, arrays, and primitives.
   * Make the data immutable.
   * @returns immutable object
   */
  private deepFreeze<S>(object: S): Readonly<S> {
    // No freezing in production (for better performance).
    if (!this.devMode || !object || typeof object !== 'object') {
      return object as Readonly<S>;
    }

    // When already frozen, we assume its children are frozen (for better performance).
    // This should be true if you always use `deepFreeze` to freeze objects.
    //
    // Note that Object.isFrozen will also return `true` for primitives (numbers,
    // strings, booleans, undefined, null), so there is no need to check for
    // those explicitly.
    if (Object.isFrozen(object)) {
      return object as Readonly<S>;
    }

    // At this point we know that we're dealing with either an array or plain object, so
    // just freeze it and recurse on its values.
    Object.freeze(object);
    Object.keys(object).forEach(key => this.deepFreeze((object as any)[key]));

    return object as Readonly<S>;
  }
}
