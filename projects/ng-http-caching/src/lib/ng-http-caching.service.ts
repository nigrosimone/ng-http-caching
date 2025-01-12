import { Injectable, InjectionToken, VERSION, isDevMode, inject } from '@angular/core';
import { HttpRequest, HttpResponse, HttpEvent, HttpContextToken, HttpContext, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs/internal/Observable';
import { NgHttpCachingStorageInterface } from './storage/ng-http-caching-storage.interface';
import { NgHttpCachingMemoryStorage } from './storage/ng-http-caching-memory-storage';

export type NgHttpCachingContext = Pick<NgHttpCachingConfig, 'getKey' | 'isCacheable' | 'isExpired' | 'isValid'>;

export const NG_HTTP_CACHING_CONTEXT = new HttpContextToken<NgHttpCachingContext>(() => ({}));

export const withNgHttpCachingContext = (value: NgHttpCachingContext, context: HttpContext = new HttpContext()) => context.set(NG_HTTP_CACHING_CONTEXT, value)

export const checkCacheHeaders = (headers: HttpHeaders): boolean => {
  // check Cache-Control
  const cacheControlHeader = headers.get('cache-control');
  if (cacheControlHeader) {
    const cacheControl = cacheControlHeader.toLowerCase();
    if (cacheControl.includes('no-store')) {
      return false;
    } else if (cacheControl.includes('no-cache')) {
      return false;
    } else {
      return true;
    }
  }

  // check Expires header Expires if response is without Cache-Control
  const expiresHeader = headers.get('expires');
  if (expiresHeader) {
    const expires = Date.parse(expiresHeader);
    if (!isNaN(expires)) {
      return expires > Date.now();
    }
  }

  return true;
}

export interface NgHttpCachingEntry<K = any, T = any> {
  /**
   * URL
   */
  url: string;
  /**
   * HttpResponse
   */
  response: HttpResponse<T>;
  /**
   * HttpRequest
   */
  request: HttpRequest<K>;
  /**
   * Timestamp of add to cache time
   */
  addedTime: number;
  /**
   * Cache version
   */
  version: string;
}

export const NG_HTTP_CACHING_CONFIG = new InjectionToken<NgHttpCachingContext>(
  'ng-http-caching.config'
);

export enum NgHttpCachingStrategy {
  /**
   * All request are cacheable if HTTP method is into `allowedMethod`
   */
  ALLOW_ALL = 'ALLOW_ALL',
  /**
   * Only the request with `X-NG-HTTP-CACHING-ALLOW-CACHE` header are cacheable if HTTP method is into `allowedMethod`
   */
  DISALLOW_ALL = 'DISALLOW_ALL'
}

export enum NgHttpCachingHeaders {
  /**
   * Request is cacheable if HTTP method is into `allowedMethod`
   */
  ALLOW_CACHE = 'X-NG-HTTP-CACHING-ALLOW-CACHE',
  /**
   * Request isn't cacheable
   */
  DISALLOW_CACHE = 'X-NG-HTTP-CACHING-DISALLOW-CACHE',
  /**
   * Specific cache lifetime for the request
   */
  LIFETIME = 'X-NG-HTTP-CACHING-LIFETIME',
  /**
   * You can tag multiple request by adding this header with the same tag and 
   * using `NgHttpCachingService.clearCacheByTag(tag: string)` for delete all the tagged request
   */
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
  /**
   * Set the cache store. You can implement your custom store by implement the `NgHttpCachingStorageInterface` interface, eg.:
   */
  store?: NgHttpCachingStorageInterface;
  /**
   * Number of millisecond that a response is stored in the cache. 
   * You can set specific "lifetime" for each request by add the header `X-NG-HTTP-CACHING-LIFETIME` (see example below).
   */
  lifetime?: number;
  /**
   * Array of allowed HTTP methods to cache. 
   * You can allow multiple methods, eg.: `['GET', 'POST', 'PUT', 'DELETE', 'HEAD']` or 
   * allow all methods by: `['ALL']`. If `allowedMethod` is an empty array (`[]`), no response are cached.
   * *Warning!* `NgHttpCaching` use the full url (url with query parameters) as unique key for the cached response,
   * this is correct for the `GET` request but is _potentially_ wrong for other type of request (eg. `POST`, `PUT`). 
   * You can set a different "key" by customizing the `getKey` config method (see `getKey` section).
   */
  allowedMethod?: string[];
  /**
   * Set the cache strategy, possible strategies are:
   * - `NgHttpCachingStrategy.ALLOW_ALL`: All request are cacheable if HTTP method is into `allowedMethod`;
   * - `NgHttpCachingStrategy.DISALLOW_ALL`: Only the request with `X-NG-HTTP-CACHING-ALLOW-CACHE` header are cacheable if HTTP method is into `allowedMethod`;
   */
  cacheStrategy?: NgHttpCachingStrategy;
  /**
   * Cache version. When you have a breaking change, change the version, and it'll delete the current cache automatically.
   * The default value is Angular major version (eg. 13), in this way, the cache is invalidated on every Angular upgrade.
   */
  version?: string;
  /**
   * If true response headers cache-control and expires are respected.
   */
  checkResponseHeaders?: boolean;
  /**
   * If this function return `true` the request is expired and a new request is send to backend, if return `false` isn't expired. 
   * If the result is `undefined`, the normal behaviour is provided.
   */
  isExpired?: <K, T>(entry: NgHttpCachingEntry<K, T>) => boolean | undefined | void;
  /**
   * If this function return `true` the request is cacheable, if return `false` isn't cacheable. 
   * If the result is `undefined`, the normal behaviour is provided.
   */
  isCacheable?: <K>(req: HttpRequest<K>) => boolean | undefined | void;
  /**
   * This function return the unique key (`string`) for store the response into the cache. 
   * If the result is `undefined`, the normal behaviour is provided.
   */
  getKey?: <K>(req: HttpRequest<K>) => string | undefined | void;
  /**
   * If this function return `true` the cache entry is valid and can be stored, if return `false` isn't valid. 
   * If the result is `undefined`, the normal behaviour is provided.
   */
  isValid?: <K, T>(entry: NgHttpCachingEntry<K, T>) => boolean | undefined | void;
}

export interface NgHttpCachingDefaultConfig extends NgHttpCachingConfig {
  store: NgHttpCachingStorageInterface;
  lifetime: number;
  allowedMethod: string[];
  cacheStrategy: NgHttpCachingStrategy;
  version: string;
  checkResponseHeaders: boolean;
}

export const NgHttpCachingConfigDefault: Readonly<NgHttpCachingDefaultConfig> = {
  store: new NgHttpCachingMemoryStorage(),
  lifetime: NG_HTTP_CACHING_HOUR_IN_MS,
  version: VERSION.major,
  allowedMethod: ['GET', 'HEAD'],
  cacheStrategy: NgHttpCachingStrategy.ALLOW_ALL,
  checkResponseHeaders: false
};

@Injectable()
export class NgHttpCachingService {

  private readonly queue = new Map<string, Observable<HttpEvent<any>>>();

  private readonly config: NgHttpCachingDefaultConfig;

  private gcLock = false;

  private devMode: boolean = isDevMode();

  constructor() {
    const config: Readonly<NgHttpCachingConfig | null> = inject(NG_HTTP_CACHING_CONFIG, { optional: true });
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
    const entry: NgHttpCachingEntry<K, T> = {
      url: req.urlWithParams,
      response: res,
      request: req,
      addedTime: Date.now(),
      version: this.config.version,
    };
    if (this.isValid(entry)) {
      const key: string = this.getKey(req);
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
   * Clear the cache by keys
   */
  clearCacheByKeys(keys: Array<string>): number {
    let counter = 0;
    if (keys) {
      for (const key of keys) {
        if (this.clearCacheByKey(key)) {
          counter++;
        }
      }
    }
    return counter;
  }

  /**
   * Clear the cache by regex
   */
  clearCacheByRegex<K, T>(regex: RegExp): number {
    const keys: Array<string> = [];
    this.config.store.forEach<K, T>((_: NgHttpCachingEntry<K, T>, key: string) => {
      if (regex.test(key)) {
        keys.push(key);
      }
    });
    return this.clearCacheByKeys(keys);
  }

  /**
   * Clear the cache by TAG
   */
  clearCacheByTag<K, T>(tag: string): number {
    const keys: Array<string> = [];
    this.config.store.forEach<K, T>((entry: NgHttpCachingEntry<K, T>, key: string) => {
      const tagHeader = entry.request.headers.get(NgHttpCachingHeaders.TAG);
      if (tagHeader && tagHeader.split(',').includes(tag)) {
        keys.push(key);
      }
    });
    return this.clearCacheByKeys(keys);
  }

  /**
   * Run garbage collector (delete expired cache entry)
   */
  runGc<K, T>(): boolean {
    if (this.gcLock) {
      return false;
    }
    this.gcLock = true;
    const keys: Array<string> = [];
    this.config.store.forEach<K, T>((entry: NgHttpCachingEntry<K, T>, key: string) => {
      if (this.isExpired(entry)) {
        keys.push(key);
      }
    });
    this.clearCacheByKeys(keys);
    this.gcLock = false;
    return true;
  }

  /**
   * Return true if cache entry is expired
   */
  isExpired<K, T>(entry: NgHttpCachingEntry<K, T>): boolean {
    // if user provide custom method, use it
    const context = entry.request.context.get(NG_HTTP_CACHING_CONTEXT);
    if (typeof context?.isExpired === 'function') {
      const result = context.isExpired(entry);
      // if result is undefined, normal behaviour is provided
      if (result !== undefined) {
        return result;
      }
    }
    // if user provide custom method, use it
    if (typeof this.config.isExpired === 'function') {
      const result = this.config.isExpired(entry);
      // if result is undefined, normal behaviour is provided
      if (result !== undefined) {
        return result;
      }
    }
    // if version change, always expire
    if (this.config.version !== entry.version) {
      return true;
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
   * Default behaviour is whether the status code falls in the 2xx range and response headers cache-control and expires allow cache.
   */
  isValid<K, T>(entry: NgHttpCachingEntry<K, T>): boolean {
    const context = entry.request.context.get(NG_HTTP_CACHING_CONTEXT);
    // if user provide custom method, use it
    if (typeof context.isValid === 'function') {
      const result = context.isValid(entry);
      // if result is undefined, normal behaviour is provided
      if (result !== undefined) {
        return result;
      }
    }
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

    let fromHeader = true;
    if (this.config.checkResponseHeaders) {
      // check if response headers allow cache
      fromHeader = checkCacheHeaders(entry.response.headers);
    }
    return entry.response.ok && fromHeader;
  }

  /**
   * Return true if the request is cacheable
   */
  isCacheable<K>(req: HttpRequest<K>): boolean {
    const context = req.context.get(NG_HTTP_CACHING_CONTEXT);
    // if user provide custom method, use it
    if (typeof context?.isCacheable === 'function') {
      const result = context.isCacheable(req);
      // if result is undefined, normal behaviour is provided
      if (result !== undefined) {
        return result;
      }
    }
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
    // if allowed method is only ALL, allow all http methods
    if (this.config.allowedMethod.length === 1) {
      if (this.config.allowedMethod[0] === 'ALL') {
        return true;
      }
    }
    // request is allowed if method is in allowedMethod
    return this.config.allowedMethod.includes(req.method);
  }

  /**
   * Return the cache key.
   * Default key is http method plus url with query parameters, eg.:
   * `GET@https://github.com/nigrosimone/ng-http-caching`
   */
  getKey<K>(req: HttpRequest<K>): string {
    // if user provide custom method, use it
    const context = req.context.get(NG_HTTP_CACHING_CONTEXT);
    if (typeof context.getKey === 'function') {
      const result = context.getKey(req);
      // if result is undefined, normal behaviour is provided
      if (result !== undefined) {
        return result;
      }
    }
    // if user provide custom method, use it
    if (typeof this.config.getKey === 'function') {
      const result = this.config.getKey(req);
      // if result is undefined, normal behaviour is provided
      if (result !== undefined) {
        return result;
      }
    }
    // default key is req.method plus url with query parameters
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
