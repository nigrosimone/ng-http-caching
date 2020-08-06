import { Injectable, InjectionToken, Inject, Optional } from '@angular/core';
import { HttpRequest, HttpResponse } from '@angular/common/http';

export interface NgxHttpCachingEntry {
  url: string;
  response: HttpResponse<any>;
  request: HttpRequest<any>;
  addedTime: number;
}

export const NGX_HTTP_CACHE_CONFIG = new InjectionToken<NgxHttpCachingConfig>(
  'ng-http-caching.config'
);

export enum NgxHttpCachingStrategy {
  ALLOW_ALL = 'ALLOW_ALL',
  DISALLOW_ALL = 'DISALLOW_ALL',
}

export enum NgxHttpCachingHeaders {
  ALLOW_CACHE = 'X-NGX-CACHE-ALLOW-CACHE',
  DISALLOW_CACHE = 'X-NGX-CACHE-DISALLOW-CACHE',
  LIFETIME = 'X-NGX-CACHE-LIFETIME',
}
export class NgxHttpCachingConfig {
  lifetime?: number;
  allowedMethod?: string[];
  cacheStrategy?: NgxHttpCachingStrategy;
  isExpired?: (entry: NgxHttpCachingEntry) => boolean | undefined;
  isCacheable?: (req: HttpRequest<any>) => boolean | undefined;
  getKey?: (req: HttpRequest<any>) => string | undefined;
}

export const NgxCacheConfigDefault: NgxHttpCachingConfig = {
  lifetime: 3600,
  allowedMethod: ['GET'],
  cacheStrategy: NgxHttpCachingStrategy.ALLOW_ALL,
};

@Injectable()
export class NgxHttpCachingService {
  public readonly store = new Map<string, NgxHttpCachingEntry>();
  private config: NgxHttpCachingConfig;

  constructor(
    @Inject(NGX_HTTP_CACHE_CONFIG) @Optional() config: NgxHttpCachingConfig
  ) {
    if (config) {
      this.config = { ...NgxCacheConfigDefault, ...config };
    } else {
      this.config = NgxCacheConfigDefault;
    }
  }

  /**
   * Return the config
   */
  getConfig(): NgxHttpCachingConfig {
    return this.config;
  }

  /**
   * Return response from cache
   */
  getFromCache(req: HttpRequest<any>): HttpResponse<any> | undefined {
    const key: string = this.getKey(req);
    const cached: NgxHttpCachingEntry = this.store.get(key);

    if (!cached) {
      return undefined;
    }

    if (this.isExpired(cached)) {
      this.store.delete(key);
      return undefined;
    }

    return cached.response;
  }

  /**
   * Add response to cache
   */
  addToCache(req: HttpRequest<any>, res: HttpResponse<any>): void {
    const key: string = this.getKey(req);
    const entry: NgxHttpCachingEntry = {
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
    return this.store.delete(key);
  }

  /**
   * Return true if cache entry is expired
   */
  isExpired(entry: NgxHttpCachingEntry): boolean {
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
    if (entry.request.headers.has(NgxHttpCachingHeaders.LIFETIME)) {
      lifetime = +entry.request.headers.get(NgxHttpCachingHeaders.LIFETIME);
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
    if (req.headers.has(NgxHttpCachingHeaders.DISALLOW_CACHE)) {
      return false;
    }
    // strategy is disallow all...
    if (this.config.cacheStrategy === NgxHttpCachingStrategy.DISALLOW_ALL) {
      // request isn't allowed if come without allow header
      if (!req.headers.has(NgxHttpCachingHeaders.ALLOW_CACHE)) {
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
    // default key id url with query parameters
    return req.urlWithParams;
  }
}
