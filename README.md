# NgHttpCaching [![Build Status](https://travis-ci.org/nigrosimone/ng-http-caching.svg?branch=master)](https://travis-ci.com/github/nigrosimone/ng-http-caching) [![Coverage Status](https://coveralls.io/repos/github/nigrosimone/ng-http-caching/badge.svg?branch=master)](https://coveralls.io/github/nigrosimone/ng-http-caching?branch=master) [![NPM version](https://img.shields.io/npm/v/ng-http-caching.svg)](https://www.npmjs.com/package/ng-http-caching)

Cache for HTTP requests in Angular application.

## Description

Sometime there is a need to cache the HTTP requests so that browser doesn’t have to hit server to fetch same data when same service is invoked serially or in parallel. `NgHttpCaching` intercept all request are made, try to retrieve a cached instance of the response and then return the cached response or send the request to the backend. Once the operation has completed cache the response.

See the [stackblitz demo](https://stackblitz.com/edit/demo-ng-http-caching?file=src%2Fapp%2Fapp.component.ts).

## Features

✅ HTTP caching<br>
✅ Handles simultaneous/parallel requests<br>
✅ Automatic garbage collector of cache<br>
✅ More than 90% unit tested<br>
✅ LocalStorage, SessionStorage, MemoryStorage and custom cache storage<br>

## Get Started

*Step 1*: install `ng-http-caching`

```bash
npm i ng-http-caching
```

*Step 2*: Import `NgHttpCachingModule` into your app module, eg.:

```ts
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { NgHttpCachingModule } from 'ng-http-caching';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    NgHttpCachingModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
  ],
})
export class AppModule { }
```

if you want configure `NgHttpCachingModule`, you can pass a configuration to the module, eg.:

```ts
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { NgHttpCachingModule, NgHttpCachingConfig } from 'ng-http-caching';

// your config...
const ngHttpCachingConfig: NgHttpCachingConfig = {
  lifetime: 1000 * 10 // cache expire after 10 seconds
};

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    NgHttpCachingModule.forRoot(ngHttpCachingConfig)
  ],
  providers: [],
  bootstrap: [AppComponent]
  ],
})
export class AppModule { }
```

## Config

This is all the configuration interface, see below for the detail of each config.

```ts
// all configuration are optionally
export interface NgHttpCachingConfig {
  version?: string;
  lifetime?: number;
  allowedMethod?: string[];
  cacheStrategy?: NgHttpCachingStrategy;
  store?: NgHttpCachingStorageInterface;
  isExpired?: (entry: NgHttpCachingEntry) => boolean | undefined;
  isValid?: (entry: NgHttpCachingEntry) => boolean | undefined;
  isCacheable?: (req: HttpRequest<any>) => boolean | undefined;
  getKey?: (req: HttpRequest<any>) => string | undefined;
}
```

### version (string - default: VERSION.major)
Cache version. When you have a breaking change, change the version, and it'll delete the current cache automatically.
The default value is Angular major version (eg. 13), in this way, the cache is invalidated on every Angular upgrade.

### lifetime (number - default: 3.600.000)
Number of millisecond that a response is stored in the cache. 
You can set specific "lifetime" for each request by add the header `X-NG-HTTP-CACHING-LIFETIME` (see example below).

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

there is also a `NgHttpCachingLocalStorage` a cache store with persistence into `localStorage`:

```ts
import { NgHttpCachingConfig, NgHttpCachingLocalStorage } from 'ng-http-caching';

const ngHttpCachingConfig: NgHttpCachingConfig = {
  store: new NgHttpCachingLocalStorage(),
};
```

and a `NgHttpCachingSessionStorage` a cache store with persistence into `sessionStorage`:

```ts
import { NgHttpCachingConfig, NgHttpCachingSessionStorage } from 'ng-http-caching';

const ngHttpCachingConfig: NgHttpCachingConfig = {
  store: new NgHttpCachingSessionStorage(),
};
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
      // an expireAt Date property. Only for this endpoint the expiration is provided by expireAt value.
      // For all the other endpoint normal behaviour is provided.
      if( entry.request.urlWithParams.indexOf('/my-endpoint') !== -1 ){
        return entry.response.body.expireAt.getTime() > Date.now();
      }
      // by returning "undefined" normal "ng-http-caching" workflow is applied
      return undefined;
    },
};
```

### isValid (function - default see NgHttpCachingService.isValid());
If this function return `true` the cache entry is valid and can be stored, if return `false` isn't valid. 
If the result is `undefined`, the normal behaviour is provided.
Default behaviour is whether the status code falls in the 2xx range.
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

## Headers

`NgHttpCaching` use some custom headers for customize the caching behaviour.
The supported headers are exported from the enum `NgHttpCachingHeaders`:

```ts
export enum NgHttpCachingHeaders {
  ALLOW_CACHE = 'X-NG-HTTP-CACHING-ALLOW-CACHE',
  DISALLOW_CACHE = 'X-NG-HTTP-CACHING-DISALLOW-CACHE',
  LIFETIME = 'X-NG-HTTP-CACHING-LIFETIME',
  TAG = 'X-NG-HTTP-CACHING-TAG',
}
```

All those headers are removed before send the request to the backend.

### X-NG-HTTP-CACHING-ALLOW-CACHE (string: any value);

If you have choose the `DISALLOW_ALL` cache strategy, you can mark specific request as cacheable by adding the header `X-NG-HTTP-CACHING-ALLOW-CACHE`, eg.:

```ts
this.http.get('https://my-json-server.typicode.com/typicode/demo/db', {
  headers: {
    [NgHttpCachingHeaders.ALLOW_CACHE]: '1',
  }
}).subscribe(e => console.log);
```

### X-NG-HTTP-CACHING-DISALLOW-CACHE (string: any value);

You can disallow specific request by add the header `X-NG-HTTP-CACHING-DISALLOW-CACHE`, eg.:

```ts
this.http.get('https://my-json-server.typicode.com/typicode/demo/db', {
  headers: { 
    [NgHttpCachingHeaders.DISALLOW_CACHE]: '1',
  }
}).subscribe(e => console.log);
```

### X-NG-HTTP-CACHING-LIFETIME (string: number of millisecond);

You can set specific lifetime for request by add the header `X-NG-HTTP-CACHING-LIFETIME` with a string value as the number of millisecond, eg.:

```ts
this.http.get('https://my-json-server.typicode.com/typicode/demo/db', {
  headers: {
    [NgHttpCachingHeaders.LIFETIME]: (1000 * 60 * 60 * 24 * 365).toString(), // one year
  }
}).subscribe(e => console.log);
```

### X-NG-HTTP-CACHING-TAG (string: tag name);

You can tag multiple request by adding special header `X-NG-HTTP-CACHING-TAG` with the same tag and 
using `NgHttpCachingService.clearCacheByTag(tag: string)` for delete all the tagged request. Eg.:

```ts
this.http.get('https://my-json-server.typicode.com/typicode/demo/db?id=1', {
  headers: {
    [NgHttpCachingHeaders.TAG]: 'foo',
  }
}).subscribe(e => console.log);
```

## Cache service

You can inject into your component the `NgHttpCachingService` that expose some utils methods:

```ts
export class NgHttpCachingService {

  /**
   * Return the config
   */
  getConfig(): NgHttpCachingConfig;

  /**
   * Return the queue map
   */
  getQueue(): Map<string, Observable<HttpEvent<any>>>;

  /**
   * Return the cache store
   */
  getStore(): NgHttpCachingStorageInterface;

  /**
   * Return response from cache
   */
  getFromCache(req: HttpRequest<any>): HttpResponse<any> | undefined;

  /**
   * Add response to cache
   */
  addToCache(req: HttpRequest<any>, res: HttpResponse<any>): boolean;

  /**
   * Delete response from cache
   */
  deleteFromCache(req: HttpRequest<any>): boolean;

  /**
   * Clear the cache
   */
  clearCache(): void;

  /**
   * Clear the cache by key
   */
  clearCacheByKey(key: string): boolean;

  /**
   * Clear the cache by regex
   */
  clearCacheByRegex(regex: RegExp): void;

  /**
   * Clear the cache by TAG
   */
  clearCacheByTag(tag: string): void;

  /**
   * Run garbage collector (delete expired cache entry)
   */
  runGc(): void;

  /**
   * Return true if cache entry is expired
   */
  isExpired(entry: NgHttpCachingEntry): boolean;

  /**
   * Return true if cache entry is valid for store in the cache
   */
  isValid(entry: NgHttpCachingEntry): boolean;

  /**
   * Return true if the request is cacheable
   */
  isCacheable(req: HttpRequest<any>): boolean;

  /**
   * Return the cache key
   */
  getKey(req: HttpRequest<any>): string;

  /**
   * Return observable from cache
   */
  getFromQueue(req: HttpRequest<any>): Observable<HttpEvent<any>> | undefined;

  /**
   * Add observable to cache
   */
  addToQueue(req: HttpRequest<any>, obs: Observable<HttpEvent<any>>): void;

  /**
   * Delete observable from cache
   */
  deleteFromQueue(req: HttpRequest<any>): boolean;

}
```

## Examples

Below there are some examples of use case.

### Example: exclude specific request from cache

You can disallow specific request by add the header `X-NG-HTTP-CACHING-DISALLOW-CACHE`, eg.:

```ts
import { Component, OnInit } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { NgHttpCachingHeaders } from 'ng-http-caching';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // This request will never cache.
    // Note: all the "special" headers in NgHttpCachingHeaders are removed before send the request to the backend.
    this.http.get('https://my-json-server.typicode.com/typicode/demo/db', {
      headers: {
         [NgHttpCachingHeaders.DISALLOW_CACHE]: '1',
      }
    }).subscribe(e => console.log);
  }
}
```

### Example: set specific lifetime for request

You can set specific lifetime for request by add the header `X-NG-HTTP-CACHING-LIFETIME` with a string value as the number of millisecond, eg.:

```ts
import { Component, OnInit } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { NgHttpCachingHeaders } from 'ng-http-caching';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // This request will expire from 365 days.
    // Note: all the "special" headers in NgHttpCachingHeaders are removed before send the request to the backend.
    this.http.get('https://my-json-server.typicode.com/typicode/demo/db', {
      headers: {
         [NgHttpCachingHeaders.LIFETIME]: (1000 * 60 * 60 * 24 * 365).toString(),
      }
    }).subscribe(e => console.log);
  }
}
```

### Example: mark specific request as cacheable (if cache strategy is DISALLOW_ALL)

If you have choose the `DISALLOW_ALL` cache strategy, you can mark specific request as cacheable by adding the header `X-NG-HTTP-CACHING-ALLOW-CACHE`, eg.:

```ts
import { Component, OnInit } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { NgHttpCachingHeaders } from 'ng-http-caching';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // This request is marked as cacheable (this is necessary only if cache strategy is DISALLOW_ALL)
    // Note: all the "special" headers in NgHttpCachingHeaders are removed before send the request to the backend.
    this.http.get('https://my-json-server.typicode.com/typicode/demo/db', {
      headers: {
         [NgHttpCachingHeaders.ALLOW_CACHE]: '1',
      }
    }).subscribe(e => console.log);
  }
}
```

### Example: clear/flush all the cache

If user switch the account (logout/login) or the application language, maybe ca be necessary clear all the cache, eg.:

```ts
import { Component } from '@angular/core';
import { NgHttpCachingService } from 'ng-http-caching';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  constructor(private ngHttpCachingService: NgHttpCachingService) {}

  clearCache(): void {
    // Clear all the cache
    this.ngHttpCachingService.clearCache();
  }
}
```

### Example: clear/flush specific cache entry

If you want delete some cache entry, eg.:

```ts
import { Component } from '@angular/core';
import { NgHttpCachingService } from 'ng-http-caching';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  constructor(private ngHttpCachingService: NgHttpCachingService) {}

  clearCache(key: string): boolean {
    // Clear the cache for the provided key
    return this.ngHttpCachingService.clearCacheByKey(key);
  }
}
```

### Example: clear/flush specific cache entry by RegEx

If you want delete some cache entry by RegEx, eg.:

```ts
import { Component } from '@angular/core';
import { NgHttpCachingService } from 'ng-http-caching';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  constructor(private ngHttpCachingService: NgHttpCachingService) {}

  clearCacheByRegex(regEx: RegExp): void {
    // Clear the cache for the key that match regex
    this.ngHttpCachingService.clearCacheByRegex(regEx);
  }
}
```

### Example: TAG request and clear/flush specific cache entry by TAG

You can tag multiple request by adding special header `X-NG-HTTP-CACHING-TAG` with the same tag and 
using `NgHttpCachingService.clearCacheByTag(tag: 
)` for delete all the tagged request. Eg.:

```ts
import { Component, OnInit } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { NgHttpCachingService } from 'ng-http-caching';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  constructor(private ngHttpCachingService: NgHttpCachingService) {}

  ngOnInit(): void {
    // This request is tagged with "foo" keyword. You can tag multiple requests with the same tag and 
    // using NgHttpCachingService.clearCacheByTag("foo") for delete all the tagged request.
    this.http.get('https://my-json-server.typicode.com/typicode/demo/db?id=1', {
      headers: {
         [NgHttpCachingHeaders.TAG]: 'foo',
      }
    }).subscribe(e => console.log);

    // This request is also tagged with "foo" keyword, and has another tag "baz".
    // You can add multiple tags comma separated.
    this.http.get('https://my-json-server.typicode.com/typicode/demo/db?id=2', {
      headers: {
         [NgHttpCachingHeaders.TAG]: 'foo,baz',
      }
    }).subscribe(e => console.log);
  }

  clearCacheForFoo(): void {
    // Clear the cache for all the entry have the tag 'foo'
    this.ngHttpCachingService.clearCacheByTag('foo');
  }
}
```

## Alternatives

Aren't you satisfied? there are some valid alternatives:

 - [@ngneat/cashew](https://www.npmjs.com/package/@ngneat/cashew)
 - [p3x-angular-http-cache-interceptor](https://www.npmjs.com/package/p3x-angular-http-cache-interceptor)
 - [@d4h/angular-http-cache](https://www.npmjs.com/package/@d4h/angular-http-cache)


## Support

This is an open-source project. Star this [repository](https://github.com/nigrosimone/ng-http-caching), if you like it, or even [donate](https://www.paypal.com/paypalme/snwp). Thank you so much!

## My other libraries

I have published some other Angular libraries, take a look:

 - [NgSimpleState: Simple state management in Angular with only Services and RxJS](https://www.npmjs.com/package/ng-simple-state)
 - [NgGenericPipe: Generic pipe for Angular application for use a component method into component template.](https://www.npmjs.com/package/ng-generic-pipe)
 - [NgLet: Structural directive for sharing data as local variable into html component template](https://www.npmjs.com/package/ng-let)
 - [NgForTrackByProperty: Angular global trackBy property directive with strict type checking](https://www.npmjs.com/package/ng-for-track-by-property)
