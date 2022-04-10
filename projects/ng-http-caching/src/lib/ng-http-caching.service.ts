import { Injectable, InjectionToken, Inject, Optional } from '@angular/core';
import { HttpRequest, HttpResponse, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs/internal/Observable';
import { NgHttpCachingStorageInterface } from './storage/ng-http-caching-storage.interface';
import { NgHttpCachingMemoryStorage } from './storage/ng-http-caching-memory-storage';

export interface NgHttpCachingEntry {
  url: string;
  response: HttpResponse<any>;
  request: HttpRequest<any>;
  addedTime: number;
  version: string;
}

export const NG_HTTP_CACHING_CONFIG = new InjectionToken<NgHttpCachingConfig>(
  'ng-http-caching.config'
);

export enum NgHttpCachingStrategy {
  // eslint-disable-next-line no-unused-vars
  ALLOW_ALL = 'ALLOW_ALL',
  // eslint-disable-next-line no-unused-vars
  DISALLOW_ALL = 'DISALLOW_ALL',
}

export enum NgHttpCachingHeaders {
  // eslint-disable-next-line no-unused-vars
  ALLOW_CACHE = 'X-NG-HTTP-CACHING-ALLOW-CACHE',
  // eslint-disable-next-line no-unused-vars
  DISALLOW_CACHE = 'X-NG-HTTP-CACHING-DISALLOW-CACHE',
  // eslint-disable-next-line no-unused-vars
  LIFETIME = 'X-NG-HTTP-CACHING-LIFETIME',
  // eslint-disable-next-line no-unused-vars
  TAG = 'X-NG-HTTP-CACHING-TAG',
}
export const NgHttpCachingHeadersList = Object.values(NgHttpCachingHeaders);
export interface NgHttpCachingConfig {
  store?: NgHttpCachingStorageInterface;
  lifetime?: number;
  allowedMethod?: string[];
  cacheStrategy?: NgHttpCachingStrategy;
  version?: string;
  // eslint-disable-next-line no-unused-vars
  isExpired?: (entry: NgHttpCachingEntry) => boolean | undefined;
  // eslint-disable-next-line no-unused-vars
  isCacheable?: (req: HttpRequest<any>) => boolean | undefined;
  // eslint-disable-next-line no-unused-vars
  getKey?: (req: HttpRequest<any>) => string | undefined;
  // eslint-disable-next-line no-unused-vars
  isValid?: (entry: NgHttpCachingEntry) => boolean | undefined;
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
  lifetime: 60 * 60 * 100,
  version: '1',
  allowedMethod: ['GET'],
  cacheStrategy: NgHttpCachingStrategy.ALLOW_ALL,
};

@Injectable()
export class NgHttpCachingService {

  private queue = new Map<string, Observable<HttpEvent<any>>>();

  private config: NgHttpCachingDefaultConfig = NgHttpCachingConfigDefault;

  constructor(
    @Inject(NG_HTTP_CACHING_CONFIG) @Optional() config: NgHttpCachingConfig
  ) {
    if (config) {
      this.config = { ...NgHttpCachingConfigDefault, ...config };
    }
  }

  /**
   * Return the config
   */
  getConfig(): NgHttpCachingConfig {
    return this.config;
  }

  /**
   * Return the queue map
   */
  getQueue(): Map<string, Observable<HttpEvent<any>>> {
    return this.queue;
  }

  /**
   * Return the cache store
   */
  getStore(): NgHttpCachingStorageInterface {
    return this.config.store as NgHttpCachingStorageInterface;
  }

  /**
   * Return response from cache
   */
  getFromCache(req: HttpRequest<any>): HttpResponse<any> | undefined {
    const key: string = this.getKey(req);
    const cached: NgHttpCachingEntry | undefined = this.config.store?.get(key);

    if (!cached) {
      return undefined;
    }

    if (this.isExpired(cached)) {
      this.clearCacheByKey(key);
      return undefined;
    }

    return cached.response;
  }

  /**
   * Add response to cache
   */
  addToCache(req: HttpRequest<any>, res: HttpResponse<any>): boolean {
    const key: string = this.getKey(req);
    const entry: NgHttpCachingEntry = {
      url: req.urlWithParams,
      response: res,
      request: req,
      addedTime: Date.now(),
      version: this.config.version,
    };
    if (this.isValid(entry)) {
      this.config.store?.set(key, entry);
      return true;
    }
    return false;
  }

  /**
   * Delete response from cache
   */
  deleteFromCache(req: HttpRequest<any>): boolean {
    const key: string = this.getKey(req);
    return this.clearCacheByKey(key);
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.config.store?.clear();
  }

  /**
   * Clear the cache by key
   */
  clearCacheByKey(key: string): boolean {
    return (this.config.store as NgHttpCachingStorageInterface).delete(key);
  }

  /**
   * Clear the cache by regex
   */
  clearCacheByRegex(regex: RegExp): void {
    (this.config.store as NgHttpCachingStorageInterface).forEach((entry: NgHttpCachingEntry, key: string) => {
      if (regex.test(key)) {
        this.clearCacheByKey(key);
      }
    });
  }

  /**
   * Clear the cache by TAG
   */
  clearCacheByTag(tag: string): void {
    (this.config.store as NgHttpCachingStorageInterface).forEach((entry: NgHttpCachingEntry, key: string) => {
      const tagHeader = entry.request.headers.get(NgHttpCachingHeaders.TAG);
      if (tagHeader && tagHeader.split(',').includes(tag)) {
        this.clearCacheByKey(key);
      }
    });
  }

  /**
   * Run garbage collector (delete expired cache entry)
   */
  runGc(): void {
    this.config.store.forEach((entry: NgHttpCachingEntry, key: string) => {
      if (this.isExpired(entry)) {
        this.clearCacheByKey(key);
      }
    });
  }

  /**
   * Return true if cache entry is expired
   */
  isExpired(entry: NgHttpCachingEntry): boolean {
    // if user provide custom method, use it
    if (typeof this.config.isExpired === 'function') {
      const result = this.config.isExpired(entry);
      // if result is undefined, normal behaviour is provided
      if (typeof result !== 'undefined') {
        return result;
      }
    }
    // config/default lifetime
    let lifetime = this.config.lifetime;
    // request has own lifetime
    if (entry.request.headers.has(NgHttpCachingHeaders.LIFETIME)) {
      lifetime = +(entry.request.headers.get(NgHttpCachingHeaders.LIFETIME) || '');
    }
    // never expire if 0
    if (lifetime === 0) {
      return false;
    }
    // wrong lifetime
    if ((lifetime as number) < 0) {
      throw new Error('lifetime must be greater than or equal 0');
    }
    return entry.addedTime + (lifetime as number) < Date.now();
  }

  /**
   * Return true if cache entry is valid for store in the cache
   */
  isValid(entry: NgHttpCachingEntry): boolean {
    // if user provide custom method, use it
    if (typeof this.config.isValid === 'function') {
      const result = this.config.isValid(entry);
      // if result is undefined, normal behaviour is provided
      if (typeof result !== 'undefined') {
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
  isCacheable(req: HttpRequest<any>): boolean {
    // if user provide custom method, use it
    if (typeof this.config.isCacheable === 'function') {
      const result = this.config.isCacheable(req);
      // if result is undefined, normal behaviour is provided
      if (typeof result !== 'undefined') {
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
    if (this.config.allowedMethod) {
      if (this.config.allowedMethod.length === 1) {
        if (this.config.allowedMethod[0] === 'ALL') {
          return true;
        }
      }
      // request is allowed if method is in allowedMethod
      return this.config.allowedMethod.indexOf(req.method) !== -1;
    }
    return true;
  }

  /**
   * Return the cache key
   */
  getKey(req: HttpRequest<any>): string {
    // if user provide custom method, use it
    if (typeof this.config.getKey === 'function') {
      const result = this.config.getKey(req);
      // if result is undefined, normal behaviour is provided
      if (typeof result !== 'undefined') {
        return result;
      }
    }
    // default key id is url with query parameters
    return req.urlWithParams;
  }

  /**
   * Return observable from cache
   */
  getFromQueue(req: HttpRequest<any>): Observable<HttpEvent<any>> | undefined {
    const key: string = this.getKey(req);
    const cached: Observable<HttpEvent<any>> | undefined = this.queue.get(key);

    if (!cached) {
      return undefined;
    }

    return cached;
  }

  /**
   * Add observable to cache
   */
  addToQueue(req: HttpRequest<any>, obs: Observable<HttpEvent<any>>): void {
    const key: string = this.getKey(req);
    this.queue.set(key, obs);
  }

  /**
   * Delete observable from cache
   */
  deleteFromQueue(req: HttpRequest<any>): boolean {
    const key: string = this.getKey(req);
    return this.queue.delete(key);
  }
}
