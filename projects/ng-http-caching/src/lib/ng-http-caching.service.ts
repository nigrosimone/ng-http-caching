import { Injectable, InjectionToken, Inject, Optional } from '@angular/core';
import { HttpRequest, HttpResponse, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs/internal/Observable';

export interface NgHttpCachingEntry {
  url: string;
  response: HttpResponse<any>;
  request: HttpRequest<any>;
  addedTime: number;
}

export const NG_HTTP_CACHING_CONFIG = new InjectionToken<NgHttpCachingConfig>(
  'ng-http-caching.config'
);

export enum NgHttpCachingStrategy {
  ALLOW_ALL = 'ALLOW_ALL',
  DISALLOW_ALL = 'DISALLOW_ALL',
}

export enum NgHttpCachingHeaders {
  ALLOW_CACHE = 'X-NG-HTTP-CACHING-ALLOW-CACHE',
  DISALLOW_CACHE = 'X-NG-HTTP-CACHING-DISALLOW-CACHE',
  LIFETIME = 'X-NG-HTTP-CACHING-LIFETIME',
  TAG = 'X-NG-HTTP-CACHING-TAG',
}
export class NgHttpCachingConfig {
  lifetime?: number;
  allowedMethod?: string[];
  cacheStrategy?: NgHttpCachingStrategy;
  isExpired?: (entry: NgHttpCachingEntry) => boolean | undefined;
  isCacheable?: (req: HttpRequest<any>) => boolean | undefined;
  getKey?: (req: HttpRequest<any>) => string | undefined;
}

export const NgHttpCachingConfigDefault: NgHttpCachingConfig = {
  lifetime: 60 * 60 * 100,
  allowedMethod: ['GET'],
  cacheStrategy: NgHttpCachingStrategy.ALLOW_ALL,
};

@Injectable()
export class NgHttpCachingService {

  public readonly store = new Map<string, NgHttpCachingEntry>();

  public readonly queue = new Map<string, Observable<HttpEvent<any>>>();

  private config: NgHttpCachingConfig;

  constructor(
    @Inject(NG_HTTP_CACHING_CONFIG) @Optional() config: NgHttpCachingConfig
  ) {
    if (config) {
      this.config = { ...NgHttpCachingConfigDefault, ...config };
    } else {
      this.config = NgHttpCachingConfigDefault;
    }
  }

  /**
   * Return the config
   */
  getConfig(): NgHttpCachingConfig {
    return this.config;
  }

  /**
   * Return response from cache
   */
  getFromCache(req: HttpRequest<any>): HttpResponse<any> | undefined {
    const key: string = this.getKey(req);
    const cached: NgHttpCachingEntry = this.store.get(key);

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
  addToCache(req: HttpRequest<any>, res: HttpResponse<any>): void {
    const key: string = this.getKey(req);
    const entry: NgHttpCachingEntry = {
      url: req.urlWithParams,
      response: res,
      request: req,
      addedTime: Date.now(),
    };
    this.store.set(key, entry);
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
    this.store.clear();
  }

  /**
   * Clear the cache by key
   */
  clearCacheByKey(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Clear the cache by regex
   */
  clearCacheByRegex(regex: RegExp): void {
    this.store.forEach((entry: NgHttpCachingEntry, key: string) => {
      if ( regex.test(key) ){
        this.clearCacheByKey(key);
      }
    });
  }

  /**
   * Clear the cache by TAG
   */
  clearCacheByTag(tag: string): void {
    this.store.forEach((entry: NgHttpCachingEntry, key: string) => {
      if ( entry.request.headers.get(NgHttpCachingHeaders.TAG) === tag ){
        this.clearCacheByKey(key);
      }
    });
  }

  /**
   * Run garbage collector (delete expired cache entry)
   */
  runGc(): void {
    this.store.forEach((entry: NgHttpCachingEntry, key: string) => {
      if ( this.isExpired(entry) ){
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
      lifetime = +entry.request.headers.get(NgHttpCachingHeaders.LIFETIME);
    }
    // never expire if 0
    if (lifetime === 0) {
      return false;
    }
    // wrong lifetime
    if (lifetime < 0) {
      throw new Error('lifetime must be greater than or equal 0');
    }
    return entry.addedTime + lifetime < Date.now();
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
    if ( this.config.allowedMethod.length === 1) {
      if (this.config.allowedMethod[0] === 'ALL'){
        return true;
      }
    }
    // request is allowed if method is in allowedMethod
    return this.config.allowedMethod.indexOf(req.method) !== -1;
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
    const cached: Observable<HttpEvent<any>> = this.queue.get(key);

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
