# NgHttpCaching [![NPM version](https://img.shields.io/npm/v/ng-http-caching.svg)](https://www.npmjs.com/package/ng-http-caching)

Cache for HTTP requests in Angular application.

## Description

Sometime there is a need to cache the HTTP requests so that browser doesn’t have to hit server to fetch same data when same service is invoked serially or in parallel. `NgHttpCaching` intercept all request are made, try to retrieve a cached instance of the response and then return the cached response or send the request to the backend. Once the operation has completed cache the response.

See the [stackblitz demo](https://stackblitz.com/edit/demo-ng-http-caching-21?file=src%2Fmain.ts).

## Features

✅ HTTP caching<br>
✅ Handles simultaneous/parallel requests<br>
✅ Automatic garbage collector of cache<br>
✅ More than 90% unit tested<br>
✅ LocalStorage, SessionStorage, MemoryStorage and custom cache storage<br>
✅ Check response headers cache-control and expires<br>
✅ Automatic cache invalidation on mutations (POST, PUT, DELETE, PATCH)<br>
✅ Server side rendering (SSR) safe<br>

## Get Started

*Step 1*: install `ng-http-caching`

```bash
npm i ng-http-caching
```

*Step 2*: Provide `NgHttpCaching` into your `bootstrapApplication`, eg.:

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { AppComponent } from './app.component';
import { provideNgHttpCaching } from 'ng-http-caching';

bootstrapApplication(AppComponent, {
  providers: [
    provideNgHttpCaching(),
    provideHttpClient(withInterceptorsFromDi())
  ]
});
```

if you want configure `ng-http-caching`, you can pass a configuration, eg.:

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { AppComponent } from './app.component';
import { provideNgHttpCaching, NgHttpCachingConfig } from 'ng-http-caching';

// your config...
const ngHttpCachingConfig: NgHttpCachingConfig = {
  lifetime: 1000 * 10 // cache expire after 10 seconds
};

bootstrapApplication(AppComponent, {
  providers: [
    provideNgHttpCaching(ngHttpCachingConfig),
    provideHttpClient(withInterceptorsFromDi())
  ]
});
```

## Config

This is all the configuration interface, see below for the detail of each config.

```ts
// all configuration are optionally
export interface NgHttpCachingConfig {
  version?: string;
  lifetime?: number;
  maxSize?: number;
  allowedMethod?: string[];
  cacheStrategy?: NgHttpCachingStrategy;
  checkResponseHeaders?: boolean;
  store?:
    | NgHttpCachingStorageInterface
    | NgHttpCachingNgSimpleStateSentinel
    | (() => NgHttpCachingStorageInterface);
  isExpired?: (entry: NgHttpCachingEntry) => boolean | undefined | void;
  isValid?: (entry: NgHttpCachingEntry) => boolean | undefined | void;
  isCacheable?: (req: HttpRequest<any>) => boolean | undefined | void;
  getKey?: (req: HttpRequest<any>) => string | undefined | void;
  clearCacheOnMutation?: NgHttpCachingMutationStrategy | boolean | ((req: HttpRequest<any>) => boolean | undefined | void);
}
```

### version (string - default: VERSION.major)
Cache version. When you have a breaking change, change the version, and it'll delete the current cache automatically.
The default value is Angular major version (eg. 13), in this way, the cache is invalidated on every Angular upgrade.

### lifetime (number - default: 3.600.000)
Number of millisecond that a response is stored in the cache. 
You can set specific "lifetime" for each request by add the header `X-NG-HTTP-CACHING-LIFETIME` (see example below).

### maxSize (number - default: 0)
Maximum number of entries kept into the cache store. When the limit is exceeded, the least
recently used entries are evicted. `0` (the default) means no limit.

```ts
const ngHttpCachingConfig: NgHttpCachingConfig = {
  maxSize: 100, // keep at most 100 responses
};
```

The access time is tracked in memory by the service. For a persistent store
(`localStorage`, `sessionStorage`) the entries restored by a previous page load have no
known access time, so they are evicted by the time they were added until they are read again.

### checkResponseHeaders (boolean - default false);
If true response headers cache-control and expires are respected.
`Cache-Control: no-store`/`no-cache`, and an `Expires` already in the past, keep the response
out of the cache; `max-age` drives the entry lifetime. The `Age` header is subtracted from
`max-age`, so a response a CDN or proxy has already been holding isn't kept for the full
`max-age` again — when `Age` is greater than or equal to `max-age` the response is already
stale and isn't cached at all.

### allowedMethod (string[] - default: ['GET', 'HEAD'])
Array of allowed HTTP methods to cache. 
You can allow multiple methods, eg.: `['GET', 'POST', 'PUT', 'DELETE', 'HEAD']` or 
allow all methods by: `['ALL']`. If `allowedMethod` is an empty array (`[]`), no response are cached.
*Warning!* `NgHttpCaching` use the full url (url with query parameters) as unique key for the cached response,
this is correct for the `GET` request but is _potentially_ wrong for other type of request (eg. `POST`, `PUT`). 
You can set a different "key" by customizing the `getKey` config method (see `getKey` section).

### cacheStrategy (enum NgHttpCachingStrategy - default: NgHttpCachingStrategy.ALLOW_ALL)
Set the cache strategy, possible strategies are:
- `NgHttpCachingStrategy.ALLOW_ALL`: All request are cacheable if HTTP method is into `allowedMethod`;
- `NgHttpCachingStrategy.DISALLOW_ALL`: Only the request with `X-NG-HTTP-CACHING-ALLOW-CACHE` header are cacheable if HTTP method is into `allowedMethod`;

### store (class of NgHttpCachingStorageInterface - default: NgHttpCachingMemoryStorage)
Set the cache store. You can implement your custom store by implement the `NgHttpCachingStorageInterface` interface, eg.:

```ts
import { NgHttpCachingConfig, NgHttpCachingStorageInterface } from 'ng-http-caching';

class MyCustomStore implements NgHttpCachingStorageInterface {
  // ... your logic
}

const ngHttpCachingConfig: NgHttpCachingConfig = {
  store: new MyCustomStore(),
};
```

the default store is `withNgHttpCachingMemoryStorage`, an in-memory cache store:

```ts
import { NgHttpCachingConfig, withNgHttpCachingMemoryStorage } from 'ng-http-caching';

const ngHttpCachingConfig: NgHttpCachingConfig = {
  store: withNgHttpCachingMemoryStorage(),
};
```

there is also a `withNgHttpCachingLocalStorage` a cache store with persistence into `localStorage`:

```ts
import { NgHttpCachingConfig, withNgHttpCachingLocalStorage } from 'ng-http-caching';

const ngHttpCachingConfig: NgHttpCachingConfig = {
  store: withNgHttpCachingLocalStorage(),
};
```

and a `withNgHttpCachingSessionStorage` a cache store with persistence into `sessionStorage`:

```ts
import { NgHttpCachingConfig, withNgHttpCachingSessionStorage } from 'ng-http-caching';

const ngHttpCachingConfig: NgHttpCachingConfig = {
  store: withNgHttpCachingSessionStorage(),
};
```

Both are safe to use with server side rendering: when `localStorage`/`sessionStorage` isn't
reachable (SSR, prerendering, sandboxed iframe, storage disabled by the user) they
transparently fall back to an in-memory storage, so nothing is persisted and nothing throws.

#### Server side rendering: pass a factory, not an instance

`store` also accepts a factory. This matters with server side rendering: the config object
is created once, when its module is loaded, so a store **instance** put in there is shared
by every request the server renders — and with it the cached responses of every user.
A factory is invoked once per `NgHttpCachingService`, so each rendered request gets its own:

```ts
import { NgHttpCachingConfig, withNgHttpCachingMemoryStorage } from 'ng-http-caching';

const ngHttpCachingConfig: NgHttpCachingConfig = {
  // ✅ one store per request
  store: () => withNgHttpCachingMemoryStorage(),
  // ❌ one store shared by all the server side rendered requests
  // store: withNgHttpCachingMemoryStorage(),
};
```

In the browser there is a single user per process, so both forms behave the same.

and a `withNgHttpCachingNgSimpleState` adapter for use [ng-simple-state](https://www.npmjs.com/package/ng-simple-state) as the cache storage.

To use this adapter, you **must install** `ng-simple-state` in your project:

```bash
npm i ng-simple-state
```

Then you can use it like this:

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideNgHttpCaching } from 'ng-http-caching';
import { withNgHttpCachingNgSimpleState } from 'ng-http-caching/ng-simple-state';
import { AppComponent } from './app.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideNgHttpCaching({
      store: withNgHttpCachingNgSimpleState(),
    }),
    provideHttpClient(withInterceptorsFromDi())
  ]
});
```

### isExpired (function - default see NgHttpCachingService.isExpired());
If this function return `true` the request is expired and a new request is send to backend, if return `false` isn't expired. 
If the result is `undefined`, the normal behaviour is provided.
Example of customization:

```ts
import { NgHttpCachingConfig, NgHttpCachingEntry } from 'ng-http-caching';

const ngHttpCachingConfig: NgHttpCachingConfig = {
  isExpired: (entry: NgHttpCachingEntry): boolean | undefined => {
      // In this example a special API endpoint (/my-endpoint) send into the body response
      // an expireAt property (an ISO date string). Only for this endpoint the expiration
      // is provided by expireAt value.
      // For all the other endpoint normal behaviour is provided.
      if( entry.request.urlWithParams.indexOf('/my-endpoint') !== -1 ){
        // return true when the entry is expired, so a new request is sent to the backend
        return Date.parse(entry.response.body.expireAt) <= Date.now();
      }
      // by returning "undefined" normal "ng-http-caching" workflow is applied
      return undefined;
    },
};
```

### isValid (function - default see NgHttpCachingService.isValid());
If this function return `true` the cache entry is valid and can be stored, if return `false` isn't valid. 
If the result is `undefined`, the normal behaviour is provided.
Default behaviour is whether the status code falls in the 2xx range and response headers cache-control and expires allow cache.
Example of customization:

```ts
import { NgHttpCachingConfig, NgHttpCachingEntry } from 'ng-http-caching';

const ngHttpCachingConfig: NgHttpCachingConfig = {
  isValid: (entry: NgHttpCachingEntry): boolean | undefined => {
      // In this example only response with status code 200 can be stored into the cache
      return entry.response.status === 200;
    },
};
```

### isCacheable (function - default see NgHttpCachingService.isCacheable());
If this function return `true` the request is cacheable, if return `false` isn't cacheable. 
If the result is `undefined`, the normal behaviour is provided.
Example of customization:

```ts
import { NgHttpCachingConfig } from 'ng-http-caching';

const ngHttpCachingConfig: NgHttpCachingConfig = {
  isCacheable: (req: HttpRequest<any>): boolean | undefined => {
      // In this example the /my-endpoint isn't cacheable.
      // For all the other endpoint normal behaviour is provided.
      if( req.urlWithParams.indexOf('/my-endpoint') !== -1 ){
        return false;
      }
      // by returning "undefined" normal "ng-http-caching" workflow is applied
      return undefined;
    },
};
```


### getKey (function - default see NgHttpCachingService.getKey());
This function return the unique key (`string`) for store the response into the cache. 
If the result is `undefined`, the normal behaviour is provided.
Example of customization:

```ts
import { NgHttpCachingConfig } from 'ng-http-caching';
import * as hash from 'object-hash';  // install object-hash with: npm i object-hash

const hashOptions = {
  algorithm: 'md5',
  encoding: 'hex'
};

const ngHttpCachingConfig: NgHttpCachingConfig = {
  allowedMethod: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'],
  getKey: (req: HttpRequest<any>): string | undefined => {
    // In this example the full request is hashed for provide an unique key for the cache.
    // This is important if you want support method like POST or PUT.
    return req.method + '@' + req.urlWithParams + '@' + hash(req.params, hashOptions) + '@' + hash(req.body, hashOptions);
  },
};
```

### clearCacheOnMutation (enum NgHttpCachingMutationStrategy | boolean | Function - default: NgHttpCachingMutationStrategy.NONE)

Set the mutation strategy for automatically clear the cache when a mutation request (POST, PUT, DELETE, PATCH) is successful.
Possible strategies are:
- `NgHttpCachingMutationStrategy.NONE` (or `false`): No automatic invalidation.
- `NgHttpCachingMutationStrategy.ALL` (or `true`): Clears the entire cache store on any successful mutation.
- `NgHttpCachingMutationStrategy.IDENTICAL`: Clears entries with the same URL (ignoring method and query params).
- `NgHttpCachingMutationStrategy.COLLECTION`: Clears entries with the same URL AND its parent collection URL (eg. `DELETE /api/users/24` invalidate also `GET /api/users`).

  `IDENTICAL` and `COLLECTION` match the URL of the cached request, not the cache key, so
  they keep working with a custom `getKey` (see the `getKey` section).

- `Function`: Custom logic: `(req: HttpRequest<any>) => boolean`. It is called only for mutation requests; returning `true` clears the **entire** cache store, returning `false` (or `undefined`) skips the invalidation for that request.

Example of customization:

```ts
import { NgHttpCachingConfig, NgHttpCachingMutationStrategy } from 'ng-http-caching';

const ngHttpCachingConfig: NgHttpCachingConfig = {
  // clear the entire cache only if the mutation (POST, PUT, DELETE, PATCH)
  // is on a specific endpoint
  clearCacheOnMutation: (req) => req.url.includes('/api/critical-data')
};
```

## Headers

`NgHttpCaching` use some custom headers for customize the caching behaviour.
The supported headers are exported from `NgHttpCachingHeaders`:

```ts
export const NgHttpCachingHeaders = {
  ALLOW_CACHE: 'X-NG-HTTP-CACHING-ALLOW-CACHE',
  DISALLOW_CACHE: 'X-NG-HTTP-CACHING-DISALLOW-CACHE',
  LIFETIME: 'X-NG-HTTP-CACHING-LIFETIME',
  TAG: 'X-NG-HTTP-CACHING-TAG',
};
```

All those headers are removed before send the request to the backend.

### X-NG-HTTP-CACHING-ALLOW-CACHE (string: any value);

If you have choose the `DISALLOW_ALL` cache strategy, you can mark specific request as cacheable by adding the header `X-NG-HTTP-CACHING-ALLOW-CACHE`, eg.:

```ts
this.http.get('https://my-json-server.typicode.com/typicode/demo/db', {
  headers: {
    [NgHttpCachingHeaders.ALLOW_CACHE]: '1',
  }
}).subscribe(e => console.log(e));
```

### X-NG-HTTP-CACHING-DISALLOW-CACHE (string: any value);

You can disallow specific request by add the header `X-NG-HTTP-CACHING-DISALLOW-CACHE`, eg.:

```ts
this.http.get('https://my-json-server.typicode.com/typicode/demo/db', {
  headers: { 
    [NgHttpCachingHeaders.DISALLOW_CACHE]: '1',
  }
}).subscribe(e => console.log(e));
```

### X-NG-HTTP-CACHING-LIFETIME (string: number of millisecond);

You can set specific lifetime for request by add the header `X-NG-HTTP-CACHING-LIFETIME` with a string value as the number of millisecond, eg.:

```ts
this.http.get('https://my-json-server.typicode.com/typicode/demo/db', {
  headers: {
    [NgHttpCachingHeaders.LIFETIME]: (1000 * 60 * 60 * 24 * 365).toString(), // one year
  }
}).subscribe(e => console.log(e));
```

### X-NG-HTTP-CACHING-TAG (string: tag name);

You can tag multiple request by adding special header `X-NG-HTTP-CACHING-TAG` with the same tag and 
using `NgHttpCachingService.clearCacheByTag(tag: string)` for delete all the tagged request. Eg.:

```ts
this.http.get('https://my-json-server.typicode.com/typicode/demo/db?id=1', {
  headers: {
    [NgHttpCachingHeaders.TAG]: 'foo',
  }
}).subscribe(e => console.log(e));
```

## HttpContext

You can override `NgHttpCachingConfig` methods:
```ts
{
  isExpired?: (entry: NgHttpCachingEntry) => boolean | undefined | void;
  isValid?: (entry: NgHttpCachingEntry) => boolean | undefined | void;
  isCacheable?: (req: HttpRequest<any>) => boolean | undefined | void;
  getKey?: (req: HttpRequest<any>) => string | undefined | void;
  clearCacheOnMutation?: NgHttpCachingMutationStrategy | boolean | ((req: HttpRequest<any>) => boolean | undefined | void);
}
```
with `HttpContextToken`, eg.:
```ts
import { withNgHttpCachingContext } from 'ng-http-caching';

const context = withNgHttpCachingContext({
  isExpired: (entry: NgHttpCachingEntry) => {
    console.log('context:isExpired', entry);
  },
  isCacheable: (req: HttpRequest<any>) => {
    console.log('context:isCacheable', req);
  },
  getKey: (req: HttpRequest<any>) => {
    console.log('context:getKey', req);
  },
  isValid: (entry: NgHttpCachingEntry) => {
    console.log('context:isValid', entry);
  }
});
this.http.get('https://my-json-server.typicode.com/typicode/demo/db?id=1', { context }).subscribe(e => console.log(e));
```

## Cache service

You can inject into your component the `NgHttpCachingService` that expose some utils methods:

```ts
export class NgHttpCachingService {

  /**
   * Return the config
   */
  getConfig(): Readonly<NgHttpCachingConfig>;

  /**
   * Return the queue map
   */
  getQueue(): Readonly<Map<string, Observable<HttpEvent<any>>>>;

  /**
   * Return the cache store
   */
  getStore(): Readonly<NgHttpCachingStorageInterface>;

  /**
   * Return response from cache
   */
  getFromCache<K, T>(req: HttpRequest<K>): Readonly<HttpResponse<T>> | undefined;

  /**
   * Add response to cache
   */
  addToCache<K, T>(req: HttpRequest<K>, res: HttpResponse<T>): boolean;

  /**
   * Delete response from cache
   */
  deleteFromCache<K>(req: HttpRequest<K>): boolean;

  /**
   * Clear the cache
   */
  clearCache(): void;

  /**
   * Clear the cache by key
   */
  clearCacheByKey(key: string): boolean;

  /**
   * Clear the cache by keys
   */
  clearCacheByKeys(keys: Array<string>): number;

  /**
   * Clear the cache by regex
   */
  clearCacheByRegex<K, T>(regex: RegExp): number;

  /**
   * Clear the cache by TAG
   */
  clearCacheByTag<K, T>(tag: string): number;

  /**
   * Clear the cache according to the `clearCacheOnMutation` strategy.
   * Called automatically by the interceptor on every successful mutation.
   */
  clearCacheByMutation<K>(req: HttpRequest<K>): boolean;

  /**
   * Run garbage collector (delete expired cache entry)
   */
  runGc<K, T>(): boolean;

  /**
   * Return true if cache entry is expired
   */
  isExpired<K, T>(entry: NgHttpCachingEntry<K, T>): boolean;

  /**
   * Return true if cache entry is valid for store in the cache
   * Default behaviour is whether the status code falls in the 2xx range and response headers cache-control and expires allow cache.
   */
  isValid<K, T>(entry: NgHttpCachingEntry<K, T>): boolean;

  /**
   * Return true if the request is cacheable
   */
  isCacheable<K>(req: HttpRequest<K>): boolean;

  /**
   * Return the cache key.
   * Default key is http method plus url with query parameters, eg.:
   * `GET@https://github.com/nigrosimone/ng-http-caching`
   */
  getKey<K>(req: HttpRequest<K>): string;

  /**
   * Return observable from cache
   */
  getFromQueue<K, T>(req: HttpRequest<K>): Observable<HttpEvent<T>> | undefined;

  /**
   * Add observable to cache
   */
  addToQueue<K, T>(req: HttpRequest<K>, obs: Observable<HttpEvent<T>>): void;

  /**
   * Delete observable from cache
   */
  deleteFromQueue<K>(req: HttpRequest<K>): boolean;
}
```

## Examples

Below there are some examples of use case.

### Example: exclude specific request from cache

You can disallow specific request by add the header `X-NG-HTTP-CACHING-DISALLOW-CACHE`, eg.:

```ts
import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NgHttpCachingHeaders } from 'ng-http-caching';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  private readonly http = inject(HttpClient);

  constructor() {
    // This request will never cache.
    // Note: all the "special" headers in NgHttpCachingHeaders are removed before send the request to the backend.
    this.http.get('https://my-json-server.typicode.com/typicode/demo/db', {
      headers: {
        [NgHttpCachingHeaders.DISALLOW_CACHE]: '1',
      }
    }).subscribe(e => console.log(e));
  }
}
```

### Example: set specific lifetime for request

You can set specific lifetime for request by add the header `X-NG-HTTP-CACHING-LIFETIME` with a string value as the number of millisecond, eg.:

```ts
import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NgHttpCachingHeaders } from 'ng-http-caching';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  private readonly http = inject(HttpClient);

  constructor() {
    // This request will expire from 365 days.
    // Note: all the "special" headers in NgHttpCachingHeaders are removed before send the request to the backend.
    this.http.get('https://my-json-server.typicode.com/typicode/demo/db', {
      headers: {
        [NgHttpCachingHeaders.LIFETIME]: (1000 * 60 * 60 * 24 * 365).toString(),
      }
    }).subscribe(e => console.log(e));
  }
}
```

### Example: mark specific request as cacheable (if cache strategy is DISALLOW_ALL)

If you have choose the `DISALLOW_ALL` cache strategy, you can mark specific request as cacheable by adding the header `X-NG-HTTP-CACHING-ALLOW-CACHE`, eg.:

```ts
import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NgHttpCachingHeaders } from 'ng-http-caching';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  private readonly http = inject(HttpClient);

  constructor() {
    // This request is marked as cacheable (this is necessary only if cache strategy is DISALLOW_ALL)
    // Note: all the "special" headers in NgHttpCachingHeaders are removed before send the request to the backend.
    this.http.get('https://my-json-server.typicode.com/typicode/demo/db', {
      headers: {
        [NgHttpCachingHeaders.ALLOW_CACHE]: '1',
      }
    }).subscribe(e => console.log(e));
  }
}
```

### Example: clear/flush all the cache

If user switch the account (logout/login) or the application language, maybe ca be necessary clear all the cache, eg.:

```ts
import { Component, inject } from '@angular/core';
import { NgHttpCachingService } from 'ng-http-caching';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  private readonly ngHttpCachingService = inject(NgHttpCachingService);

  clearCache(): void {
    // Clear all the cache
    this.ngHttpCachingService.clearCache();
  }
}
```

### Example: clear/flush specific cache entry

If you want delete some cache entry, eg.:

```ts
import { Component, inject } from '@angular/core';
import { NgHttpCachingService } from 'ng-http-caching';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  private readonly ngHttpCachingService = inject(NgHttpCachingService);

  clearCache(key: string): boolean {
    // Clear the cache for the provided key
    return this.ngHttpCachingService.clearCacheByKey(key);
  }
}
```

### Example: clear/flush specific cache entry by RegEx

If you want delete some cache entry by RegEx, eg.:

```ts
import { Component, inject } from '@angular/core';
import { NgHttpCachingService } from 'ng-http-caching';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  private readonly ngHttpCachingService = inject(NgHttpCachingService);

  clearCacheByRegex(regEx: RegExp): void {
    // Clear the cache for the key that match regex
    this.ngHttpCachingService.clearCacheByRegex(regEx);
  }
}
```

### Example: TAG request and clear/flush specific cache entry by TAG

You can tag multiple request by adding special header `X-NG-HTTP-CACHING-TAG` with the same tag and 
using `NgHttpCachingService.clearCacheByTag(tag: string)` for delete all the tagged request. Eg.:

```ts
import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NgHttpCachingService, NgHttpCachingHeaders } from 'ng-http-caching';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  private readonly ngHttpCachingService = inject(NgHttpCachingService);
  private readonly http = inject(HttpClient);

  constructor() {
    // This request is tagged with "foo" keyword. You can tag multiple requests with the same tag and 
    // using NgHttpCachingService.clearCacheByTag("foo") for delete all the tagged request.
    this.http.get('https://my-json-server.typicode.com/typicode/demo/db?id=1', {
      headers: {
        [NgHttpCachingHeaders.TAG]: 'foo',
      }
    }).subscribe(e => console.log(e));

    // This request is also tagged with "foo" keyword, and has another tag "baz".
    // You can add multiple tags comma separated.
    this.http.get('https://my-json-server.typicode.com/typicode/demo/db?id=2', {
      headers: {
        [NgHttpCachingHeaders.TAG]: 'foo,baz',
      }
    }).subscribe(e => console.log(e));
  }

  clearCacheForFoo(): void {
    // Clear the cache for all the entry have the tag 'foo'
    this.ngHttpCachingService.clearCacheByTag('foo');
  }
}
```

## Limitations

`NgHttpCaching` is a TTL cache with request deduplication, **not** a full implementation of
the HTTP caching semantics. Know what it doesn't do before you rely on it.

### ⚠️ The cache key ignores the request headers

The default key is `method@url` (see the `getKey` section):
two requests to the same URL share the same cache entry **even if they carry different
headers**. For an `Authorization` header this means that, after a user switch, the previous
user's response can still be served from the cache.

If you cache anything user specific, do one of the following:

- clear the cache when the identity changes — the simplest and safest option:

  ```ts
  // on login, logout, tenant or language switch
  this.ngHttpCachingService.clearCache();
  ```

- or make the identity part of the key:

  ```ts
  const ngHttpCachingConfig: NgHttpCachingConfig = {
    getKey: (req) => req.method + '@' + req.urlWithParams + '@' + (req.headers.get('Authorization') ?? ''),
  };
  ```

- or keep user specific requests out of the cache entirely, with the
  `X-NG-HTTP-CACHING-DISALLOW-CACHE` header or a custom `isCacheable`.

### `Vary` is not supported

The `Vary` response header is ignored. A response negotiated on `Accept-Language`,
`Accept-Encoding` or any other header is served to every request matching the cache key,
whatever the negotiation was. Use `getKey` to include the relevant headers yourself.

### No conditional revalidation

There is no `ETag`/`Last-Modified` handling and no conditional request (`If-None-Match`,
`If-Modified-Since`, `304 Not Modified`). An entry is either fresh, and used as is, or
expired, and refetched in full. Likewise `no-cache` is treated as "don't store" rather than
"store, but revalidate before use".

## Alternatives

Aren't you satisfied? there are some valid alternatives:

 - [@ngneat/cashew](https://www.npmjs.com/package/@ngneat/cashew)
 - [p3x-angular-http-cache-interceptor](https://www.npmjs.com/package/p3x-angular-http-cache-interceptor)
 - [@d4h/angular-http-cache](https://www.npmjs.com/package/@d4h/angular-http-cache)


## Support

This is an open-source project. Star this [repository](https://github.com/nigrosimone/ng-http-caching), if you like it, or even [donate](https://www.paypal.com/paypalme/snwp). Thank you so much!

## My other libraries

I have published some other Angular libraries, take a look:

 - [NgSimpleState: Simple state management in Angular with only Services and RxJS or Signal](https://www.npmjs.com/package/ng-simple-state)
 - [NgGenericPipe: Generic pipe for Angular application for use a component method into component template.](https://www.npmjs.com/package/ng-generic-pipe)
 - [NgLet: Structural directive for sharing data as local variable into html component template](https://www.npmjs.com/package/ng-let)
 - [NgForTrackByProperty: Angular global trackBy property directive with strict type checking](https://www.npmjs.com/package/ng-for-track-by-property)
