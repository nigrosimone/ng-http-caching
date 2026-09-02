import {
  Injectable,
  InjectionToken,
  PLATFORM_ID,
  VERSION,
  isDevMode,
  inject,
  OnDestroy,
} from '@angular/core';
import { isPlatformServer } from '@angular/common';
import {
  HttpRequest,
  HttpResponse,
  HttpEvent,
  HttpContextToken,
  HttpContext,
  HttpHeaders,
} from '@angular/common/http';
import type { Observable, Subscription } from 'rxjs';
import { NgHttpCachingStorageInterface } from './storage/ng-http-caching-storage.interface';
import { NgHttpCachingMemoryStorage } from './storage/ng-http-caching-memory-storage';
import { NgHttpCachingNgSimpleStateSentinel } from './storage/ng-http-caching-ng-simple-state-sentinel';

export type NgHttpCachingContext = Pick<
  NgHttpCachingConfig,
  | 'getKey'
  | 'isCacheable'
  | 'isExpired'
  | 'isStale'
  | 'isValid'
  | 'clearCacheOnMutation'
  | 'mutationInvalidation'
  | 'responseSerializer'
  | 'keepInFlight'
>;

/**
 * Return the body to serve for a cache hit, starting from the body kept into the store.
 */
export type NgHttpCachingResponseSerializer = <T>(body: T) => T;

export const NG_HTTP_CACHING_CONTEXT = new HttpContextToken<NgHttpCachingContext>(() => ({}));

export const withNgHttpCachingContext = (
  value: NgHttpCachingContext,
  context: HttpContext = new HttpContext(),
) => context.set(NG_HTTP_CACHING_CONTEXT, value);

export const checkCacheHeaders = (headers: HttpHeaders): boolean | number => {
  // check Cache-Control
  const cacheControlHeader = headers.get('cache-control');
  if (cacheControlHeader) {
    const cacheControl = cacheControlHeader.toLowerCase();
    if (cacheControl.includes('no-store')) {
      return false;
    } else if (cacheControl.includes('no-cache')) {
      return false;
    }
    // extract max-age value if present
    const maxAgeMatch = /max-age\s*=\s*(\d+)/.exec(cacheControl);
    if (maxAgeMatch) {
      const maxAgeSec = parseInt(maxAgeMatch[1], 10);
      // `max-age` is counted from the moment the response was generated, not from the
      // moment we received it: an upstream shared cache (CDN, proxy) reports with `Age`
      // how long it has been holding it already, and that much freshness is already gone.
      const freshSec = maxAgeSec - getAgeSeconds(headers);
      // `max-age=0`, or a response already older than its `max-age`, is immediately
      // stale, so it isn't cacheable. Returning a `0` lifetime here would collide with
      // the "0 = never expire" sentinel used by `isExpired`, caching it forever.
      if (freshSec <= 0) {
        return false;
      }
      // return the remaining freshness in milliseconds so the caller can use it as lifetime
      return freshSec * 1000;
    }
    return true;
  }

  // check Expires header if response is without Cache-Control
  const expires = getExpiresDeadline(headers);
  if (expires !== undefined) {
    return expires > Date.now();
  }

  return true;
};

/**
 * Return the value of the `Age` response header in seconds, or `0` when the header is
 * missing or unusable. `Age` is the time the response has already spent in the upstream
 * shared caches, and it has to be subtracted from `max-age`.
 */
export const getAgeSeconds = (headers: HttpHeaders): number => {
  const ageHeader = headers.get('age');
  if (!ageHeader) {
    return 0;
  }
  const age = parseInt(ageHeader.trim(), 10);
  return isNaN(age) || age < 0 ? 0 : age;
};

/**
 * Return the absolute timestamp of the `Expires` response header, or `undefined` when
 * the header is missing/unparsable or when `Cache-Control` (which takes precedence) is set.
 */
export const getExpiresDeadline = (headers: HttpHeaders): number | undefined => {
  if (headers.get('cache-control')) {
    return undefined;
  }
  const expiresHeader = headers.get('expires');
  if (!expiresHeader) {
    return undefined;
  }
  const expires = Date.parse(expiresHeader);
  return isNaN(expires) ? undefined : expires;
};

/**
 * Return the lifetime carried by the `X-NG-HTTP-CACHING-LIFETIME` header, or `undefined`
 * when the header is missing or blank. A blank value must not be read as `0`, because `0`
 * is the "never expire" sentinel: it has to fall back to the configured lifetime instead.
 */
const getHeaderLifetime = (headers: HttpHeaders): number | undefined => {
  const headerLifetime = headers.get(NgHttpCachingHeaders.LIFETIME)?.trim();
  if (!headerLifetime) {
    return undefined;
  }
  return +headerLifetime;
};

/**
 * Return true for structures that are safe to recursively freeze.
 */
const isPlainObjectOrArray = (value: unknown): boolean => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  if (Array.isArray(value)) {
    return true;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

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
   * Timestamp of the moment the body was received from the backend.
   * It drives `staleTime`, and unlike `addedTime` it isn't moved by `slidingExpiration`:
   * reading an entry keeps it into the cache, it doesn't make it fresh again.
   * Missing on the entries stored by a version before `staleTime` existed, `addedTime`
   * is then used instead.
   */
  freshTime?: number;
  /**
   * True when the entry has been invalidated: it is still served, but it is stale, so
   * it is refreshed in background at the first read. See `invalidateCache()` and the
   * `mutationInvalidation` config.
   */
  invalidated?: boolean;
  /**
   * Cache version
   */
  version: string;
}

export interface NgHttpCachingCacheHit<T = any> {
  /**
   * The response kept into the cache.
   */
  response: Readonly<HttpResponse<T>>;
  /**
   * True when the response is older than `staleTime`: it is served as it is, but the
   * interceptor refreshes it in background.
   */
  stale: boolean;
}

export const NG_HTTP_CACHING_CONFIG = new InjectionToken<NgHttpCachingConfig>(
  'ng-http-caching.config',
);

export const NgHttpCachingStrategy = {
  /**
   * All request are cacheable if HTTP method is into `allowedMethod`
   */
  ALLOW_ALL: 'ALLOW_ALL',
  /**
   * Only the request with `X-NG-HTTP-CACHING-ALLOW-CACHE` header are cacheable if HTTP method is into `allowedMethod`
   */
  DISALLOW_ALL: 'DISALLOW_ALL',
};
export type NgHttpCachingStrategy =
  (typeof NgHttpCachingStrategy)[keyof typeof NgHttpCachingStrategy];

export const NgHttpCachingMutationStrategy = {
  /**
   * No invalidation on mutation
   */
  NONE: 'NONE',
  /**
   * Clear all cache on mutation
   */
  ALL: 'ALL',
  /**
   * Clear only the cache entries with the same URL as the mutation request
   */
  IDENTICAL: 'IDENTICAL',
  /**
   * Clear the cache entries with the same URL or the parent URL as the mutation request
   */
  COLLECTION: 'COLLECTION',
};
export type NgHttpCachingMutationStrategy =
  (typeof NgHttpCachingMutationStrategy)[keyof typeof NgHttpCachingMutationStrategy];

export const NgHttpCachingInvalidation = {
  /**
   * Invalidated entries are removed from the cache: the next request waits for the backend
   */
  DELETE: 'DELETE',
  /**
   * Invalidated entries are kept and marked stale: the next request is served with the old
   * response and the entry is refreshed in background
   */
  STALE: 'STALE',
};
export type NgHttpCachingInvalidation =
  (typeof NgHttpCachingInvalidation)[keyof typeof NgHttpCachingInvalidation];

export const NgHttpCachingHeaders = {
  /**
   * Request is cacheable if HTTP method is into `allowedMethod`
   */
  ALLOW_CACHE: 'X-NG-HTTP-CACHING-ALLOW-CACHE',
  /**
   * Request isn't cacheable
   */
  DISALLOW_CACHE: 'X-NG-HTTP-CACHING-DISALLOW-CACHE',
  /**
   * Specific cache lifetime for the request
   */
  LIFETIME: 'X-NG-HTTP-CACHING-LIFETIME',
  /**
   * You can tag multiple request by adding this header with the same tag and
   * using `NgHttpCachingService.clearCacheByTag(tag: string)` for delete all the tagged request
   */
  TAG: 'X-NG-HTTP-CACHING-TAG',
};
export type NgHttpCachingHeaders = (typeof NgHttpCachingHeaders)[keyof typeof NgHttpCachingHeaders];

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
   *
   * A factory can be provided instead of an instance: it is invoked once per
   * `NgHttpCachingService`, in the injection context, so that every server side rendered
   * request gets its own store instead of sharing one across all the rendered requests.
   */
  store?:
    | NgHttpCachingStorageInterface
    | NgHttpCachingNgSimpleStateSentinel
    | (() => NgHttpCachingStorageInterface);
  /**
   * Number of millisecond that a response is stored in the cache.
   * You can set specific "lifetime" for each request by add the header `X-NG-HTTP-CACHING-LIFETIME` (see example below).
   */
  lifetime?: number;
  /**
   * Maximum number of entries kept into the cache store.
   * When the limit is exceeded, the least recently used entries are evicted.
   * `0` (the default) means no limit.
   */
  maxSize?: number;
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
   * If true the lifetime restarts at every cache hit, so an entry that keeps being read
   * never expires, and only an entry left unused for a whole `lifetime` does.
   * A deadline coming from the response headers (`max-age`, `Expires`, with
   * `checkResponseHeaders`) belongs to the server and isn't moved.
   * Note that every cache hit writes back to the store: with a persistent store
   * (`localStorage`, `sessionStorage`) that is a serialization on every read.
   */
  slidingExpiration?: boolean;
  /**
   * Number of millisecond a response stays fresh. Once it is older than `staleTime`, and
   * until `lifetime` expires it, the cached response is still served, but a request is
   * sent to the backend in background to refresh it (stale-while-revalidate).
   * `undefined` (the default) disables it: a response is fresh until it expires.
   * `0` makes every cached response stale, so every hit revalidates.
   */
  staleTime?: number;
  /**
   * When a stale entry is refreshed and the cached response carries an `ETag` or a
   * `Last-Modified`, send the refresh as a conditional request (`If-None-Match`,
   * `If-Modified-Since`). A `304 Not Modified` then confirms the entry we already have,
   * with no body to download.
   * Default `true`. It does nothing when the response carries no validator.
   */
  conditionalRevalidation?: boolean;
  /**
   * What `clearCacheOnMutation` does to the entries it invalidates:
   * - `NgHttpCachingInvalidation.DELETE` (the default): they are removed, so the next
   *   request waits for the backend;
   * - `NgHttpCachingInvalidation.STALE`: they are kept and marked stale, so the next
   *   request is served with the old response while the entry is refreshed in background.
   */
  mutationInvalidation?: NgHttpCachingInvalidation;
  /**
   * By default a request is cancelled when its last subscriber goes away (a destroyed
   * component, a `takeUntilDestroyed`, a route change), so the response never reaches the
   * cache. Set this to `true` to let a cacheable request run to the end anyway: nothing is
   * emitted to the gone subscriber, but the response fills the cache for the next one.
   * A function is called with the request, and only for cacheable requests.
   */
  keepInFlight?: boolean | (<K>(req: HttpRequest<K>) => boolean | undefined | void);
  /**
   * If this function return `true` the cache entry is stale and is refreshed in background,
   * if return `false` it isn't stale. If the result is `undefined`, the normal behaviour
   * (`staleTime`) is provided.
   * An expired entry is never stale: it is refetched, not revalidated.
   */
  isStale?: <K, T>(
    entry: NgHttpCachingEntry<K, T>,
    req?: HttpRequest<K>,
  ) => boolean | undefined | void;
  /**
   * If this function return `true` the request is expired and a new request is send to backend, if return `false` isn't expired.
   * If the result is `undefined`, the normal behaviour is provided.
   * `req` is the request currently being served, so it can be compared with the one that
   * filled the cache (`entry.request`). It is `undefined` when the check comes from the
   * garbage collector, where there is no request in flight.
   */
  isExpired?: <K, T>(
    entry: NgHttpCachingEntry<K, T>,
    req?: HttpRequest<K>,
  ) => boolean | undefined | void;
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
  /**
   * Set the mutation strategy.
   * If `true`, it behaves like `NgHttpCachingMutationStrategy.ALL`.
   * If `false`, it behaves like `NgHttpCachingMutationStrategy.NONE`.
   * If a custom function is provided, returning `true` will clear the **entire** cache store.
   * Returning `false` (or `undefined`) will skip invalidation for that request.
   */
  clearCacheOnMutation?:
    | NgHttpCachingMutationStrategy
    | boolean
    | (<K>(req: HttpRequest<K>) => boolean | undefined | void);
  /**
   * By default a cache hit serves the very same body instance kept into the store, and the
   * body is made immutable in dev mode so that a consumer can't silently change what every
   * later cache hit serves. When your code needs to mutate the response (eg. it adapts it
   * into a model in place), set this function to return a copy of the body instead, eg.:
   *
   * ```ts
   * responseSerializer: (body) => structuredClone(body)
   * ```
   *
   * The copy is not frozen, and what the store keeps is left untouched.
   */
  responseSerializer?: NgHttpCachingResponseSerializer;
}

export interface NgHttpCachingDefaultConfig extends NgHttpCachingConfig {
  store: NgHttpCachingStorageInterface;
  lifetime: number;
  maxSize: number;
  allowedMethod: string[];
  cacheStrategy: NgHttpCachingStrategy;
  version: string;
  checkResponseHeaders: boolean;
  slidingExpiration: boolean;
  conditionalRevalidation: boolean;
  mutationInvalidation: NgHttpCachingInvalidation;
}

export const NgHttpCachingConfigDefault: Readonly<NgHttpCachingDefaultConfig> = {
  // a getter, so that reading (or spreading) the defaults never hands out a
  // store instance shared between services
  get store(): NgHttpCachingStorageInterface {
    return new NgHttpCachingMemoryStorage();
  },
  lifetime: NG_HTTP_CACHING_HOUR_IN_MS,
  maxSize: 0,
  version: VERSION.major,
  allowedMethod: ['GET', 'HEAD'],
  cacheStrategy: NgHttpCachingStrategy.ALLOW_ALL,
  checkResponseHeaders: false,
  slidingExpiration: false,
  conditionalRevalidation: true,
  clearCacheOnMutation: NgHttpCachingMutationStrategy.NONE,
  mutationInvalidation: NgHttpCachingInvalidation.DELETE,
};

/**
 * Creates a fresh default config with a new store instance.
 * This avoids sharing a single Map across multiple service instances (important in tests).
 */
function createDefaultConfig(): NgHttpCachingDefaultConfig {
  return { ...NgHttpCachingConfigDefault };
}

@Injectable({ providedIn: 'root' })
export class NgHttpCachingService implements OnDestroy {
  private readonly queue = new Map<string, Observable<HttpEvent<any>>>();

  private readonly config: NgHttpCachingDefaultConfig;

  /**
   * Last access time by cache key, used to evict the least recently used entries when
   * `maxSize` is exceeded. It is kept here, and not into the entries, so that reading
   * from the cache doesn't need to write back to the store.
   */
  private readonly lastAccess = new Map<string, number>();

  /**
   * Number of invalidations performed by `clearCacheByMutation` so far, and the value it
   * had when each pending request was queued. A response requested before an invalidation
   * already describes the state the mutation has changed, so it must not be cached.
   */
  private mutationEpoch = 0;
  private readonly queueEpoch = new Map<string, number>();

  private gcLock = false;
  private gcLastRun = 0;

  private readonly isServer: boolean = isPlatformServer(inject(PLATFORM_ID));

  /**
   * Requests kept alive by `keepInFlight` after their last subscriber went away.
   * They are held here so that they can be cancelled when the service is destroyed:
   * on the server that means at the end of the rendered request.
   */
  private readonly keptAlive = new Set<Subscription>();

  private devMode: boolean = isDevMode();

  constructor() {
    const userConfig: Readonly<NgHttpCachingConfig | null> = inject(NG_HTTP_CACHING_CONFIG, {
      optional: true,
    });
    if (userConfig) {
      // drop the keys explicitly set to `undefined`: spreading them over the defaults
      // would replace the default value with `undefined` (eg. a config built as
      // `{ store: isBrowser ? withNgHttpCachingLocalStorage() : undefined }` would
      // leave the service without any store at all)
      const config: NgHttpCachingConfig = {};
      for (const [key, value] of Object.entries(userConfig)) {
        if (value !== undefined) {
          (config as Record<string, unknown>)[key] = value;
        }
      }
      if (config.store instanceof NgHttpCachingNgSimpleStateSentinel) {
        config.store = inject(config.store.adapterClass);
      } else if (typeof config.store === 'function') {
        // a factory: invoked here, in the injection context, so that every service
        // instance (eg. every server side rendered request) owns its store
        config.store = config.store();
      }
      this.config = { ...createDefaultConfig(), ...config } as NgHttpCachingDefaultConfig;
    } else {
      this.config = createDefaultConfig();
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
    return this.getFromCacheWithState<K, T>(req)?.response;
  }

  /**
   * Return the response from the cache, together with whether it is stale.
   * A stale response is served as it is, but the caller (the interceptor) refreshes it
   * in background. See the `staleTime` config.
   */
  getFromCacheWithState<K, T>(req: HttpRequest<K>): NgHttpCachingCacheHit<T> | undefined {
    const key: string = this.getKey(req);
    const cached: NgHttpCachingEntry<K, T> | undefined = this.config.store.get<K, T>(key);

    if (!cached) {
      return undefined;
    }

    // the live request is handed over so that its `HttpContext` overrides are honoured:
    // a persistent store can't serialize an `HttpContext`, so the request of the entry
    // may have come back without one
    if (this.isExpired(cached, req)) {
      this.clearCacheByKey(key);
      return undefined;
    }

    const now = Date.now();
    this.lastAccess.set(key, now);

    if (this.config.slidingExpiration && !this.hasResponseDeadline(cached)) {
      // the lifetime restarts from this read, so an entry in use never expires
      this.config.store.set<K, T>(key, { ...cached, addedTime: now });
    }

    const stale = this.isStale(cached, req);

    // when a `responseSerializer` is configured, every reader gets its own copy of the
    // body and is free to mutate it: what the store keeps is left untouched
    const responseSerializer = this.getResponseSerializer(req);
    if (responseSerializer) {
      return {
        response: cached.response.clone({ body: responseSerializer(cached.response.body) }),
        stale,
      };
    }

    return { response: this.freezeResponse(cached.response), stale };
  }

  /**
   * Return the `responseSerializer` in charge for this request, if any.
   * The per request one (`HttpContext`) takes precedence over the global config.
   */
  private getResponseSerializer<K>(
    req: HttpRequest<K>,
  ): NgHttpCachingResponseSerializer | undefined {
    const context = req.context.get(NG_HTTP_CACHING_CONTEXT);
    if (typeof context?.responseSerializer === 'function') {
      return context.responseSerializer;
    }
    if (typeof this.config.responseSerializer === 'function') {
      return this.config.responseSerializer;
    }
    return undefined;
  }

  /**
   * Return true when the expiration of this entry is driven by the response headers
   * (`max-age`, `Expires`). That deadline is the server's, so `slidingExpiration`
   * must not move it. The request lifetime header wins over the response headers,
   * so when it's there the deadline is ours again.
   */
  private hasResponseDeadline<K, T>(entry: NgHttpCachingEntry<K, T>): boolean {
    if (!this.config.checkResponseHeaders) {
      return false;
    }
    if (getHeaderLifetime(entry.request.headers) !== undefined) {
      return false;
    }
    return (
      typeof checkCacheHeaders(entry.response.headers) === 'number' ||
      getExpiresDeadline(entry.response.headers) !== undefined
    );
  }

  /**
   * Add response to cache
   */
  addToCache<K, T>(req: HttpRequest<K>, res: HttpResponse<T>): boolean {
    const key: string = this.getKey(req);
    // this response was requested before a mutation invalidated the cache: it describes
    // the state the mutation has changed, so storing it would defeat `clearCacheOnMutation`
    const epoch = this.queueEpoch.get(key);
    if (epoch !== undefined && epoch < this.mutationEpoch) {
      return false;
    }
    // with a `responseSerializer` the store keeps a private copy of the body, so the
    // response handed to the subscriber of this request is as mutable as the one served
    // to every later cache hit
    const responseSerializer = this.getResponseSerializer(req);
    const now = Date.now();
    const entry: NgHttpCachingEntry<K, T> = {
      url: req.urlWithParams,
      response: responseSerializer ? res.clone({ body: responseSerializer(res.body) }) : res,
      request: req,
      addedTime: now,
      freshTime: now,
      version: this.config.version,
    };
    if (this.isValid(entry)) {
      // freeze before storing, and not only when reading back: the very same response is
      // handed to the subscriber of the request that filled the cache, and mutating it
      // would silently change what every later cache hit serves
      if (!responseSerializer) {
        this.freezeResponse(res);
      }
      this.config.store.set(key, entry);
      this.lastAccess.set(key, entry.addedTime);
      this.enforceMaxSize();
      return true;
    }
    return false;
  }

  /**
   * Evict the least recently used entries until the store fits into `maxSize`
   */
  private enforceMaxSize<K, T>(): void {
    const maxSize = this.config.maxSize;
    if (!maxSize || maxSize < 1 || this.config.store.size <= maxSize) {
      return;
    }
    const keys: { key: string; lastAccess: number }[] = [];
    this.config.store.forEach<K, T>((entry: NgHttpCachingEntry<K, T>, key: string) => {
      // when the last access is unknown (eg. an entry restored from a persistent store
      // by a previous page load) fall back to the time the entry was added
      keys.push({ key, lastAccess: this.lastAccess.get(key) ?? entry.addedTime });
    });
    keys.sort((a, b) => a.lastAccess - b.lastAccess);
    this.clearCacheByKeys(keys.slice(0, keys.length - maxSize).map((k) => k.key));
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
    this.lastAccess.clear();
    this.config.store.clear();
  }

  /**
   * Clear the cache by key
   */
  clearCacheByKey(key: string): boolean {
    this.lastAccess.delete(key);
    return this.config.store.delete(key);
  }

  /**
   * Clear the cache by keys
   */
  clearCacheByKeys(keys: string[]): number {
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
    return this.clearCacheByKeys(this.keysByRegex<K, T>(regex));
  }

  /**
   * Clear the cache by TAG
   */
  clearCacheByTag<K, T>(tag: string): number {
    return this.clearCacheByKeys(this.keysByTag<K, T>(tag));
  }

  /**
   * Mark every cache entry as invalidated: they are still served, but they are stale,
   * so the first read of each refreshes it in background.
   */
  invalidateCache<K, T>(): number {
    return this.invalidateCacheByKeys(this.keysByFilter<K, T>(() => true));
  }

  /**
   * Mark the cache entry for the provided key as invalidated
   */
  invalidateCacheByKey(key: string): boolean {
    return this.invalidateCacheByKeys([key]) > 0;
  }

  /**
   * Mark the cache entries for the provided keys as invalidated.
   * Return the number of entries actually marked.
   */
  invalidateCacheByKeys<K, T>(keys: string[]): number {
    let count = 0;
    for (const key of keys) {
      const entry: NgHttpCachingEntry<K, T> | undefined = this.config.store.get<K, T>(key);
      // an entry already invalidated isn't written again: with a persistent store that
      // would be a serialization for nothing
      if (!entry || entry.invalidated) {
        continue;
      }
      this.config.store.set<K, T>(key, { ...entry, invalidated: true });
      count++;
    }
    return count;
  }

  /**
   * Mark the cache entries whose key match the regex as invalidated
   */
  invalidateCacheByRegex<K, T>(regex: RegExp): number {
    return this.invalidateCacheByKeys(this.keysByRegex<K, T>(regex));
  }

  /**
   * Mark the cache entries having the provided TAG as invalidated
   */
  invalidateCacheByTag<K, T>(tag: string): number {
    return this.invalidateCacheByKeys(this.keysByTag<K, T>(tag));
  }

  /**
   * Keys of the entries matching `predicate`
   */
  private keysByFilter<K, T>(
    predicate: (entry: NgHttpCachingEntry<K, T>, key: string) => boolean,
  ): string[] {
    const keys: string[] = [];
    this.config.store.forEach<K, T>((entry: NgHttpCachingEntry<K, T>, key: string) => {
      if (predicate(entry, key)) {
        keys.push(key);
      }
    });
    return keys;
  }

  /**
   * Keys matching the regex
   */
  private keysByRegex<K, T>(regex: RegExp): string[] {
    const keys = this.keysByFilter<K, T>((_, key) => {
      // a global (`/g`) or sticky (`/y`) regex keeps its `lastIndex` between the calls
      // to `test`, so it would match only some of the keys: restart from the beginning
      // for every key, and leave the regex reusable by the caller
      regex.lastIndex = 0;
      return regex.test(key);
    });
    regex.lastIndex = 0;
    return keys;
  }

  /**
   * Keys of the entries carrying the TAG
   */
  private keysByTag<K, T>(tag: string): string[] {
    return this.keysByFilter<K, T>((entry) => {
      const tagHeader = entry.request.headers.get(NgHttpCachingHeaders.TAG);
      return !!tagHeader
        ?.split(',')
        .map((t) => t.trim())
        .includes(tag);
    });
  }

  /**
   * Keys of the entries whose URL (without the query parameters) is one of `urls`
   */
  private keysByUrls<K, T>(urls: string[]): string[] {
    return this.keysByFilter<K, T>((entry) => urls.includes(entry.url?.split('?')[0]));
  }

  /**
   * Apply the mutation invalidation, deleting the entries or marking them stale
   * according to the `mutationInvalidation` config. Without `urls` the whole cache
   * is invalidated.
   */
  private applyMutation<K>(req: HttpRequest<K>, urls?: string[]): void {
    const context = req.context.get(NG_HTTP_CACHING_CONTEXT);
    const invalidation = context.mutationInvalidation ?? this.config.mutationInvalidation;
    if (invalidation === NgHttpCachingInvalidation.STALE) {
      if (urls) {
        this.invalidateCacheByKeys(this.keysByUrls<K, any>(urls));
      } else {
        this.invalidateCache();
      }
      return;
    }
    if (urls) {
      this.clearCacheByKeys(this.keysByUrls<K, any>(urls));
    } else {
      this.clearCache();
    }
  }

  /**
   * Run garbage collector (delete expired cache entry)
   */
  runGc<K, T>(): boolean {
    if (this.gcLock || (this.gcLastRun && Date.now() - this.gcLastRun < 1000)) {
      return false;
    }
    this.gcLock = true;
    this.gcLastRun = Date.now();
    try {
      const keys: string[] = [];
      this.config.store.forEach<K, T>((entry: NgHttpCachingEntry<K, T>, key: string) => {
        let expired: boolean;
        try {
          expired = this.isExpired(entry);
        } catch {
          // an entry we can't evaluate (eg. corrupted lifetime, throwing custom `isExpired`)
          // must not break every request going through the interceptor: drop it instead.
          expired = true;
        }
        if (expired) {
          keys.push(key);
        }
      });
      this.clearCacheByKeys(keys);
    } finally {
      this.gcLock = false;
    }
    return true;
  }

  /**
   * Clear the cache by mutation
   */
  clearCacheByMutation<K>(req: HttpRequest<K>): boolean {
    const context = req.context.get(NG_HTTP_CACHING_CONTEXT);
    const strategy = context.clearCacheOnMutation ?? this.config.clearCacheOnMutation;

    if (strategy === false || strategy === NgHttpCachingMutationStrategy.NONE) {
      return false;
    }

    // only a mutation can invalidate the cache, whatever the strategy is
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      return false;
    }

    if (typeof strategy === 'function') {
      const result = strategy(req);
      if (result === true) {
        this.openMutationEpoch(req);
        this.applyMutation(req);
        return true;
      }
      return false;
    }

    if (strategy === true || strategy === NgHttpCachingMutationStrategy.ALL) {
      this.openMutationEpoch(req);
      this.applyMutation(req);
      return true;
    }

    const url = req.urlWithParams.split('?')[0];

    // the entry URL is matched, and not the cache key, so that these strategies keep
    // working when `getKey` is customized (eg. to hash the body, as needed to cache
    // POST/PUT requests) and the key isn't `method@urlWithParams` anymore

    if (strategy === NgHttpCachingMutationStrategy.IDENTICAL) {
      this.openMutationEpoch(req);
      this.applyMutation(req, [url]);
      return true;
    }

    if (strategy === NgHttpCachingMutationStrategy.COLLECTION) {
      const urls = [url];
      const parts = url.split('/');
      if (parts.length > 1) {
        parts.pop();
        urls.push(parts.join('/'));
      }
      this.openMutationEpoch(req);
      this.applyMutation(req, urls);
      return true;
    }

    return false;
  }

  /**
   * Open a new invalidation epoch: every request queued before this point carries an older
   * epoch and won't be cached anymore by `addToCache`. The mutation itself is moved into
   * the new epoch, because its own response is the result of the mutation, not stale data.
   */
  private openMutationEpoch<K>(req: HttpRequest<K>): void {
    this.mutationEpoch++;
    const key: string = this.getKey(req);
    if (this.queueEpoch.has(key)) {
      this.queueEpoch.set(key, this.mutationEpoch);
    }
  }

  /**
   * Return the request to send to refresh a stale entry: the same one, plus the
   * conditional headers when the cached response carries a validator, so the backend can
   * answer `304 Not Modified` instead of sending the body again.
   * See the `conditionalRevalidation` config.
   */
  getConditionalRequest<K, T>(req: HttpRequest<K>): HttpRequest<K> {
    if (!this.config.conditionalRevalidation) {
      return req;
    }
    const cached: NgHttpCachingEntry<K, T> | undefined = this.config.store.get<K, T>(
      this.getKey(req),
    );
    if (!cached) {
      return req;
    }
    const etag = cached.response.headers.get('etag');
    const lastModified = cached.response.headers.get('last-modified');
    if (!etag && !lastModified) {
      return req;
    }
    let headers = req.headers;
    if (etag) {
      headers = headers.set('If-None-Match', etag);
    }
    if (lastModified) {
      headers = headers.set('If-Modified-Since', lastModified);
    }
    return req.clone({ headers });
  }

  /**
   * Confirm the cached entry after a `304 Not Modified`: the body we hold is still the
   * current one, so both clocks restart and the entry isn't invalidated anymore.
   * Return the confirmed response, or `undefined` when there is nothing to confirm.
   */
  confirmFromCache<K, T>(req: HttpRequest<K>): Readonly<HttpResponse<T>> | undefined {
    const key: string = this.getKey(req);
    const cached: NgHttpCachingEntry<K, T> | undefined = this.config.store.get<K, T>(key);
    if (!cached) {
      return undefined;
    }
    const now = Date.now();
    // the entry has just been confirmed by the backend, so it is as good as one fetched
    // now: the retention clock restarts too, not only the freshness one
    this.config.store.set<K, T>(key, {
      ...cached,
      addedTime: now,
      freshTime: now,
      invalidated: false,
    });
    this.lastAccess.set(key, now);
    return cached.response;
  }

  /**
   * Return true if the request must run to the end even when its last subscriber goes
   * away. See the `keepInFlight` config.
   */
  keepInFlight<K>(req: HttpRequest<K>): boolean {
    const context = req.context.get(NG_HTTP_CACHING_CONTEXT);
    const config = context?.keepInFlight ?? this.config.keepInFlight;
    if (typeof config === 'function') {
      return config(req) === true;
    }
    return config === true;
  }

  /**
   * Subscribe to a request so that it completes even with no subscriber left.
   * Nothing is emitted anywhere: the response only lands into the cache.
   */
  keepAlive<T>(obs: Observable<HttpEvent<T>>): void {
    // the subscriber this response was meant for may already be gone, so an error here
    // has nowhere to go: swallow it instead of reaching the global error handler
    const subscription = obs.subscribe({ error: () => undefined });
    if (subscription.closed) {
      return;
    }
    this.keptAlive.add(subscription);
    subscription.add(() => this.keptAlive.delete(subscription));
  }

  /**
   * Return true if the cache entry is stale, so it is served as it is and refreshed in
   * background. See the `staleTime` config.
   * Revalidation is always off on the server: it would only slow the render down, and
   * the browser starts from an empty cache anyway.
   */
  isStale<K, T>(entry: NgHttpCachingEntry<K, T>, req?: HttpRequest<K>): boolean {
    if (this.isServer) {
      return false;
    }
    // if user provide custom method, use it
    const context = (req ?? entry.request).context.get(NG_HTTP_CACHING_CONTEXT);
    if (typeof context?.isStale === 'function') {
      const result = context.isStale(entry, req);
      // if result is undefined, normal behaviour is provided
      if (result !== undefined) {
        return result;
      }
    }
    // if user provide custom method, use it
    if (typeof this.config.isStale === 'function') {
      const result = this.config.isStale(entry, req);
      // if result is undefined, normal behaviour is provided
      if (result !== undefined) {
        return result;
      }
    }
    // an invalidated entry is stale whatever `staleTime` says
    if (entry.invalidated) {
      return true;
    }
    const staleTime = this.config.staleTime;
    if (staleTime === undefined) {
      return false;
    }
    if (staleTime < 0 || isNaN(staleTime)) {
      throw new Error('staleTime must be greater than or equal 0');
    }
    // `freshTime` is the moment the body came from the backend: `slidingExpiration`
    // moves `addedTime`, so reading an entry keeps it, but doesn't make it fresh again
    return (entry.freshTime ?? entry.addedTime) + staleTime <= Date.now();
  }

  /**
   * Return true if cache entry is expired.
   * `req` is the request currently being served, when there is one: its `HttpContext` is
   * the authoritative one, because a persistent store rebuilds `entry.request` from its
   * serialized form and an `HttpContext` (it holds live functions) can't survive that.
   */
  isExpired<K, T>(entry: NgHttpCachingEntry<K, T>, req?: HttpRequest<K>): boolean {
    // if user provide custom method, use it
    const context = (req ?? entry.request).context.get(NG_HTTP_CACHING_CONTEXT);
    if (typeof context?.isExpired === 'function') {
      const result = context.isExpired(entry, req);
      // if result is undefined, normal behaviour is provided
      if (result !== undefined) {
        return result;
      }
    }
    // if user provide custom method, use it
    if (typeof this.config.isExpired === 'function') {
      const result = this.config.isExpired(entry, req);
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
    // request has own lifetime header (takes highest priority)
    const headerLifetime = getHeaderLifetime(entry.request.headers);
    if (headerLifetime !== undefined) {
      lifetime = headerLifetime;
    } else if (this.config.checkResponseHeaders) {
      // check response headers for max-age
      const headerResult = checkCacheHeaders(entry.response.headers);
      if (typeof headerResult === 'number') {
        lifetime = headerResult;
      } else {
        // `Expires` is an absolute deadline: express it as a lifetime relative to
        // the time the entry was stored, so that it drives the expiration too.
        const expires = getExpiresDeadline(entry.response.headers);
        if (expires !== undefined) {
          if (expires <= entry.addedTime) {
            // already stale on arrival; a `0` lifetime would mean "never expire"
            return true;
          }
          lifetime = expires - entry.addedTime;
        }
      }
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

    // an entry with an unusable lifetime would make `isExpired` throw on every read
    // and on every garbage collection, so it must not enter the cache at all.
    const headerLifetime = getHeaderLifetime(entry.request.headers);
    if (headerLifetime !== undefined && (isNaN(headerLifetime) || headerLifetime < 0)) {
      return false;
    }

    if (this.config.checkResponseHeaders) {
      // check if response headers allow cache
      const headerResult = checkCacheHeaders(entry.response.headers);
      if (headerResult === false) {
        return false;
      }
    }
    return entry.response.ok;
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
    // if ALL is in the allowed method, allow all http methods
    if (this.config.allowedMethod.includes('ALL')) {
      return true;
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
    this.queueEpoch.set(key, this.mutationEpoch);
  }

  /**
   * Delete observable from cache
   */
  deleteFromQueue<K>(req: HttpRequest<K>): boolean {
    const key: string = this.getKey(req);
    this.queueEpoch.delete(key);
    return this.queue.delete(key);
  }

  /**
   * Make the body of the response immutable, but leave the `HttpResponse` alone: its own
   * properties (`status`, `ok`, `url`, ...) are written by whoever builds a response from
   * it downstream, and the instance stored into the cache is the very same one handed to
   * the subscriber of the request that filled it.
   * @returns the same response, with an immutable body
   */
  private freezeResponse<T>(res: HttpResponse<T>): Readonly<HttpResponse<T>> {
    this.deepFreeze(res.body);
    return res;
  }

  /**
   * Recursively Object.freeze simple Javascript structures consisting of plain objects, arrays, and primitives.
   * Make the data immutable.
   * @returns immutable object
   */
  private deepFreeze<S>(object: S): Readonly<S> {
    // No freezing in production (for better performance).
    //
    // Only plain objects and arrays are frozen: class instances are not "simple
    // structures" and may need to mutate themselves, eg. `HttpHeaders` initializes itself
    // lazily on the first read and throws once frozen.
    if (!this.devMode || !isPlainObjectOrArray(object)) {
      return object;
    }

    // When already frozen, we assume its children are frozen (for better performance).
    // This should be true if you always use `deepFreeze` to freeze objects.
    if (Object.isFrozen(object)) {
      return object;
    }

    Object.freeze(object);
    Object.keys(object as object).forEach((key) => {
      this.deepFreeze((object as Record<string, unknown>)[key]);
    });

    return object;
  }

  ngOnDestroy(): void {
    // iterate a copy: unsubscribing removes the subscription from the set
    for (const subscription of Array.from(this.keptAlive)) {
      subscription.unsubscribe();
    }
    this.keptAlive.clear();
    this.config.store.destroy?.();
    this.queue.clear();
    this.queueEpoch.clear();
    this.lastAccess.clear();
  }
}
